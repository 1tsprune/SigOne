# SigOne — PRD and Architecture

## Reference architecture

This project reuses the proven pattern from `inact25/n8n-wag-daily-summary`:

- Real-time ingestion (webhook) decoupled from scheduled batch processing.
- Postgres as the source of truth between ingestion and summarization.
- LLM forced into structured JSON output (never free-text parsing).
- Exact statistics computed by SQL, never guessed by the LLM.
- Idempotent, auditable runs — one row per source per day, re-runs upsert.
- Fault isolation — one failing source doesn't break the others.
- Error alerting as a separate linked workflow.
- Everything shippable as exported n8n workflow JSON — no app code, no build step.

SigOne applies the same discipline to **security alert triage**, instead of
WhatsApp chat summaries.

---

# 1. Product Requirements Document

## Product name

**SigOne** (Signal One — one signal from every SIEM)

## Tagline

**Any SIEM, one daily brief.**

## One-line description

SigOne is a source-agnostic security alert digest pipeline. It ingests
alerts from any SIEM/XDR/log source via webhook, normalizes them into a
common schema, and sends a structured daily (or hourly) summary to
WhatsApp/Slack/Telegram — severity breakdown, top offenders, action items,
and MITRE ATT&CK context where the source provides it.

## Problem

Every org running a SIEM (Wazuh, Splunk, Sentinel, CrowdStrike, Elastic,
QRadar, whatever) ends up with the same operational gap:

- Alerts pile up in a dashboard nobody checks until something breaks.
- On-call analysts get paged for individual alerts but have no "what
  happened overnight" digest.
- Every vendor's alert JSON is shaped differently, so every integration
  is a one-off script tied to one tool.
- When the org switches SIEMs (common — Wazuh → Sentinel migrations,
  XDR consolidation, etc.), all the "AI summarizer" tooling breaks and
  has to be rebuilt from scratch.
- Existing "AI + SIEM" tools in the market are almost always single-vendor
  (a Wazuh dashboard plugin, a Splunk app, a Sentinel Logic App) — there's
  a gap for something that treats the alert source as swappable.

## Product goal

SigOne should make "what happened in our environment today" answerable
in one WhatsApp/Slack message, regardless of which SIEM/XDR produced the
underlying alerts — and stay useful even if the org changes SIEM vendors
later.

## Non-goals

SigOne is not:

- A SIEM or log storage platform (Postgres here is a staging/summary
  store, not a replacement for the SIEM's own long-term storage).
- A detection engine — it does not generate new detections, only
  summarizes what the upstream SIEM already alerted on.
- A full SOAR/orchestration platform — no automated response actions.
- A replacement for the analyst reviewing raw alerts in the SIEM console.
- A single-vendor native app (no "Wazuh-only" or "Splunk-only" hardcoding).
- A tool that stores or transmits alert data to any third party beyond
  the LLM provider and the destination chat channel the user configures.

## Primary users

| User | Need | SigOne value |
| --- | --- | --- |
| SOC analyst (on-call) | Quick "what happened" without opening the SIEM | Daily/hourly digest to WhatsApp/Slack |
| SOC manager | Aggregate visibility across tools | Cross-source severity/volume trend |
| MSSP / consultant | One pipeline across many clients' different SIEMs | Source-agnostic normalization, per-client config |
| Detection engineer | Spot noisy rules generating alert fatigue | Volume-by-rule stats, no LLM guessing |
| Recruiter / hiring manager | Understand security engineering + automation depth | Working pipeline + clear normalization design |

## Core product promise

SigOne takes this:

```text
[Wazuh alert JSON] or [Splunk HEC event] or [Sentinel Logic App payload]
  or [CrowdStrike XDR webhook] or [Elastic Security connector payload]
  or [generic JSON via custom mapping]
```

And produces this, delivered to WhatsApp/Slack/Telegram:

```text
🛡️ SigOne — Daily Brief
📅 30 Jul 2026 | Source: wazuh-prod, sentinel-corp

Severity breakdown: 3 critical, 12 high, 41 medium, 88 low
Top rule: "Multiple failed SSH logins" (14 hits, host db-01)
Top source IP: 203.0.113.44 (9 events across 2 sources)

MITRE ATT&CK seen today: T1110 (Brute Force), T1059 (Command Execution)

Action items:
- Investigate repeated SSH failures on db-01 (possible brute force)
- Review Sentinel alert on unusual PowerShell execution (host FIN-WKS-07)

Full detail: [link to case in dashboard, if configured]
```

---

# 2. Architecture

## Reused pattern (from the reference n8n project)

```text
Ingestion (real-time)                    Summarization (scheduled batch)
──────────────────────                   ────────────────────────────────
[Any SIEM/XDR] ──webhook──▶ Normalize     Get Active Sources ──▶ source_registry
                     │                             │
            Map to common schema           Loop Over Sources ──done──▶ All Done
                     │                             │  (per source, per client)
                     ▼                             ▼
              Upsert Event                 Get Today's Events ──▶ security_events
           (dedupe by event_id)                    │
                     │                    Build Digest (+ exact stats + prompt)
              security_events                       │
           (normalized, source-tagged)      Any events today?
                                              ├─ yes ▶ Summarize (LLM Chain)
                                              │         ├── LLM Chat Model
                                              │         └── Structured Output Parser
                                              │             ▶ Render Digest
                                              └─ no  ▶ No Activity Message
                                                     │
                                              Send via WhatsApp/Slack/Telegram
                                                     │
                                              Log Run ──▶ sitrep_runs
                                                     └── loops back to Loop ──┘

error-alert workflow: On Workflow Error ──▶ Build Alert ──▶ Send Alert
```

## Why source-agnostic, not single-vendor

The reference project's "Normalize Payload" node is the template: it maps a
version-dependent go-wa payload into flat fields before storage. SigOne
does the same thing per SIEM vendor, but the mapping itself is **configurable
data, not hardcoded parser code per vendor**.

```text
[Raw webhook payload] ──▶ [Mapping Config lookup by source_id] ──▶
    JSONPath/dot-notation extraction ──▶ [Common schema row] ──▶ Postgres
```

Shipped mapping presets (starting set, expandable):

| Source | Delivery mechanism | Native MITRE tagging? |
| --- | --- | --- |
| Wazuh | Webhook/API (rule-based JSON) | No — rules must be tagged manually |
| Splunk | HTTP Event Collector (HEC) webhook | No — depends on app/CIM mapping |
| Microsoft Sentinel | Logic App / Graph Security API webhook | Yes — `Tactics[]`/`Techniques[]` native |
| CrowdStrike (XDR) | Alert stream webhook | Yes — native ATT&CK tagging |
| Elastic Security | Kibana webhook connector | Partial — depends on rule config |
| Generic JSON | Any webhook + custom field mapping | User-defined |

Where a source already provides MITRE tagging (Sentinel, CrowdStrike), the
mapping passes it through as-is rather than re-deriving it. Where it doesn't
(Wazuh, generic), MITRE tagging is left null unless the org has already
tagged their own rules — SigOne does not invent ATT&CK mappings from raw
alert text, consistent with the "don't force weak mappings" principle used
in PCAPCase.

## Common schema (Postgres)

```sql
security_events (
  event_id        text primary key,   -- dedupe key (source-provided or hash)
  source_id       text not null,      -- e.g. 'wazuh-prod', 'sentinel-corp'
  source_type     text not null,      -- 'wazuh' | 'splunk' | 'sentinel' | 'crowdstrike' | 'elastic' | 'generic'
  received_at     timestamptz not null,
  event_time      timestamptz,        -- original alert timestamp if provided
  severity        text,               -- normalized: critical/high/medium/low/info
  rule_name       text,
  description     text,
  src_ip          text,
  dst_ip          text,
  hostname        text,
  mitre_technique text,               -- nullable — only if source provides it
  mitre_tactic    text,               -- nullable
  raw             jsonb not null       -- original payload, for debugging/audit
)

source_registry (
  source_id       text primary key,
  source_type     text not null,
  mapping_config  jsonb not null,     -- field-path mapping for this source
  active          boolean default true,
  send_channel    text not null,      -- 'telegram' | 'whatsapp' | 'slack'
  send_to         text,               -- chat_id / phone number / channel id, per send_channel
  client_label    text                -- for MSSP multi-tenant use
)

sitrep_runs (
  run_date        date,
  source_id       text,
  status          text,               -- success/empty/error
  event_count     int,
  created_at      timestamptz default now(),
  primary key (run_date, source_id)
)
```

## Mapping config format (example — Wazuh preset)

```json
{
  "severity": "$.rule.level",
  "rule_name": "$.rule.description",
  "description": "$.full_log",
  "src_ip": "$.data.srcip",
  "hostname": "$.agent.name",
  "event_time": "$.timestamp",
  "severity_scale": { "type": "wazuh_level", "critical": 15, "high": 12, "medium": 7 }
}
```

Each preset also defines how to translate the source's own severity scale
into SigOne's normalized critical/high/medium/low — because "level 12" in
Wazuh and "High" in Sentinel mean different things and must not be conflated
silently.

---

# 3. MVP scope

## Functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-001 | Generic webhook endpoint accepting arbitrary JSON | Must |
| FR-002 | Store raw payload unmodified alongside normalized fields | Must |
| FR-003 | Mapping config per source_id (JSONPath-based) | Must |
| FR-004 | Ship presets for Wazuh, Splunk (generic HEC), Sentinel, generic JSON | Must |
| FR-005 | Dedupe by event_id | Must |
| FR-006 | Severity normalization per source (documented mapping, not guessed) | Must |
| FR-007 | Scheduled digest per source, exact stats via SQL | Must |
| FR-008 | LLM summary via structured output (topics/action items), same pattern as reference project | Must |
| FR-009 | Pass through MITRE tagging when source provides it; never invent it | Must |
| FR-010 | Send digest via Telegram Bot API (default/simplest — no gateway needed); WhatsApp (reuse go-wa) and Slack as additional channel options | Must |
| FR-011 | Error alert workflow (reused pattern) | Should |
| FR-012 | Multi-tenant source registry (for MSSP use — per-client send_to) | Should |
| FR-013 | CrowdStrike and Elastic presets | Later |
| FR-014 | Web dashboard beyond WhatsApp/Slack digest | Later |

## Non-functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-001 | No alert data sent anywhere except the configured LLM provider and destination channel | Must |
| NFR-002 | Secrets (API keys, webhook auth) only in n8n credentials, never in workflow JSON | Must |
| NFR-003 | Adding a new source type requires only a new mapping config, no new workflow logic | Must |
| NFR-004 | Deterministic stats (counts, top rule, top IP) computed by SQL, never by LLM | Must |
| NFR-005 | Fault isolation — one source's failure doesn't block others' digests | Must |

---

# 4. Repository design

## Proposed structure

```text
sigone/
├── README.md
├── CHANGELOG.md
├── LICENSE
├── SECURITY.md
├── docker-compose.yml
├── .env.example
├── methodology/
│   ├── 00-sigone-process.md
│   ├── 01-source-onboarding.md
│   ├── 02-normalization-model.md
│   ├── 03-severity-normalization.md
│   └── 04-mitre-passthrough-policy.md
├── docs/
│   ├── installation.md
│   ├── mapping-config-spec.md
│   ├── output-schema.md
│   ├── examples.md
│   └── limitations.md
├── sources/
│   ├── wazuh/
│   │   ├── source-card.md
│   │   └── mapping.json
│   ├── splunk-hec/
│   │   ├── source-card.md
│   │   └── mapping.json
│   ├── sentinel/
│   │   ├── source-card.md
│   │   └── mapping.json
│   ├── crowdstrike/
│   │   ├── source-card.md
│   │   └── mapping.json
│   ├── elastic/
│   │   ├── source-card.md
│   │   └── mapping.json
│   └── generic-json/
│       ├── source-card.md
│       └── mapping.json
├── db/
│   └── schema.sql
├── workflows/
│   ├── sigone-setup.json
│   ├── sigone-admin.json
│   ├── sigone-ingest.json
│   ├── sigone-daily-digest.json
│   ├── sigone-error-alert.json
│   ├── sigone-reset.json
│   └── sigone-data.json
├── examples/
│   ├── sample-digest.md
│   └── sample-events/
└── tests/
    ├── fixtures/
    └── mapping/
```

## Why this structure works

| Folder | Purpose |
| --- | --- |
| `methodology/` | Documents the normalization philosophy and severity/MITRE policy, so a contributor understands the *why*, not just the *how*. |
| `sources/` | One **Source Card** + mapping config per SIEM/XDR — the equivalent of PCAPCase's Case Cards. |
| `docs/` | Installation, the mapping-config spec (so users can write their own), schema, limitations. |
| `db/schema.sql` | Reference schema for the SQL-first setup path (mirrors the reference project's `db/schema.sql`). |
| `workflows/` | Exported n8n workflow JSON — no app code, no build step, same shipping model as the reference project. |
| `examples/` | Sanitized sample digest + sample normalized events, for portfolio/demo use. |
| `tests/` | Fixture-based tests for mapping configs — verify a raw payload maps to the expected common-schema row. |

---

# 5. README design

## README outline

```text
# SigOne

Any SIEM, one daily brief. A source-agnostic security alert digest
pipeline built on n8n, Postgres, and structured LLM output.

License · Platform · n8n version · Status

## If you are... Start here
## What this is
## Quick start
## Supported sources
## How it works
## Adding a new source
## Example output
## Repository structure
## MITRE ATT&CK policy
## Roadmap
## Security and privacy
## Author
## License
```

## Start-here table

```md
## If you are... Start here

| If you are... | Start here |
| --- | --- |
| Onboarding your SIEM for the first time | `sources/<your-siem>/source-card.md` |
| Writing a mapping for an unsupported SIEM | `docs/mapping-config-spec.md` |
| A SOC manager wanting the digest format | `examples/sample-digest.md` |
| An MSSP with multiple clients' SIEMs | `methodology/01-source-onboarding.md` |
| Checking what MITRE mapping policy is | `methodology/04-mitre-passthrough-policy.md` |
| A recruiter / hiring manager | README + one Source Card + sample digest |
```

## What this is

Suggested README wording:

> SigOne ingests security alerts from any SIEM or XDR, normalizes them into
> one common schema via a per-source mapping config, and delivers a
> structured daily brief to WhatsApp or Slack. It never invents MITRE
> ATT&CK mappings — it passes through what the source already provides, or
> leaves the field null. Adding a new SIEM means writing a mapping config,
> not new workflow logic.

---

# 6. Source Card system

The reference project's per-behavior documentation becomes, here, one
**Source Card** per SIEM/XDR integration — what it looks like, how to
onboard it, and what NOT to assume about its data.

## Source Card template (`sources/wazuh/source-card.md`)

```md
# Wazuh

## Delivery mechanism
Webhook (via Wazuh's integrator/webhook module) or API poll.

## Native MITRE tagging
No — Wazuh rules require manual ATT&CK tagging in the rule definition
itself. If your ruleset doesn't tag rules, `mitre_technique` stays null.

## Severity scale
Wazuh uses `rule.level` (0-15+, integer). Mapping to SigOne's
critical/high/medium/low is NOT 1:1 across ruleset customizations — the
default mapping assumes an unmodified default ruleset:

| Wazuh level | SigOne severity |
| --- | --- |
| 12+ | critical |
| 8-11 | high |
| 4-7 | medium |
| 0-3 | low |

If your organization has customized rule levels, adjust
`sources/wazuh/mapping.json`'s `severity_scale` block before relying on
this mapping — do not assume the default table above applies to a
heavily customized Wazuh deployment.

## Fields available
- `rule.level`, `rule.description`, `rule.id`
- `agent.name`, `agent.id`
- `data.srcip`, `data.dstip` (when present — not all rules populate these)
- `full_log` (raw log line)
- `timestamp`

## Known gaps
- No native MITRE tagging without custom rule configuration.
- `data.srcip`/`data.dstip` are rule-dependent — some alert types (e.g.
  file integrity monitoring) won't have network fields at all.

## Mapping file
`sources/wazuh/mapping.json`
```

Every other preset (Splunk, Sentinel, CrowdStrike, Elastic, generic-json)
follows this exact template — this is what keeps onboarding a new SIEM
predictable instead of ad hoc.

---

# 7. Data model and schema documentation

## `docs/output-schema.md` sections

- `security_events` — full column reference, nullability rules, and
  which columns are source-dependent (e.g. `mitre_technique` is null for
  most Wazuh deployments — this is documented, not a bug).
- `source_registry` — mapping config structure, `active` flag semantics.
- `sitrep_runs` — audit trail schema, status values.
- Digest message schema (what fields the LLM's structured output parser
  is constrained to: `topics[]`, `top_offenders[]`, `action_items[]`,
  `mitre_seen[]`).

## `docs/mapping-config-spec.md`

Defines, for anyone writing a mapping for an unsupported source:

- JSONPath syntax supported (dot notation, array indexing).
- Required fields (`severity`, `event_id_source` — how to derive a
  dedupe key if the source doesn't provide one) vs optional fields.
- The `severity_scale` block format and how it's applied.
- How to test a new mapping against a sample payload before going live
  (`tests/mapping/` fixture format).

## `docs/limitations.md`

Be honest, same spirit as PCAPCase:

- SigOne summarizes what the upstream SIEM already alerted on — it does
  not detect anything the SIEM missed.
- MITRE coverage is only as good as the source's own tagging; SigOne
  does not backfill missing ATT&CK context from alert text.
- Severity normalization assumes default/common rule configurations per
  source — heavily customized rulesets need mapping adjustments.
- LLM-generated action items are suggestions, not verified remediation
  steps — an analyst still needs to review the underlying alert.

---

# 8. Workflow design (n8n)

## Ingestion (`sigone-ingest`)

1. **Webhook** receives POST from any configured source.
2. **Identify Source** looks up `source_id` (passed as a query param,
   header, or path segment — configurable per source at registration).
3. **Load Mapping Config** reads `source_registry.mapping_config` for
   that `source_id`.
4. **Normalize Payload** applies the JSONPath mapping, extracts severity
   and translates it via the source's `severity_scale`, computes
   `event_id` (source-provided or a hash of key fields if not).
5. **Upsert Event** inserts into `security_events` with
   `ON CONFLICT (event_id) DO NOTHING` — same dedupe pattern as the
   reference project.

## Digest (`sigone-daily-digest`)

1. Scheduled trigger (default: daily, configurable per deployment).
2. **Get Active Sources** reads `source_registry` where `active = true`.
3. **Loop Over Sources** — one iteration per source (or per
   `client_label`, for MSSP multi-tenant grouping).
4. **Get Today's Events** — exact SQL query, scoped to that source/client.
5. **Build Digest Input** — computes exact stats (counts by severity,
   top rule, top source IP) via SQL, assembles the LLM prompt with the
   event list (capped, same `MAX_CHARS`-style guardrail as the reference
   project for high-volume days).
6. **Any events today?** branches:
   - Yes → **Summarize (LLM Chain)** with a **Structured Output Parser**
     enforcing `{ topics[], top_offenders[], action_items[], mitre_seen[] }`.
   - No → **No Activity Message**.
7. **Send by channel** — branches on `source_registry.send_channel`:
   Telegram (native n8n Telegram node, bot token + chat_id — default,
   no gateway required), WhatsApp (reuse go-wa pattern), or Slack.
8. **Log Run** upserts into `sitrep_runs`.

## Error alerts (`sigone-error-alert`)

Same pattern as the reference project: **On Workflow Error** → **Build
Alert** (workflow name, failing node, error message) → **Send Alert** to
the admin channel.

---

# 9. Security and privacy design

## Defaults

- Secrets (LLM API key, webhook auth, DB password, Telegram bot token,
  go-wa/WhatsApp credentials) live only in n8n credentials — never in
  workflow JSON or the repo, same rule as the reference project.
- Values derived from alert content are passed as bound SQL parameters,
  never string-concatenated into queries.
- The generic webhook endpoint requires an auth token/header per source
  — an unauthenticated source cannot inject events.
- Raw payloads are stored (`security_events.raw`) for audit/debugging,
  but the LLM prompt only receives the normalized, capped subset needed
  for the digest — not the full raw JSON of every event.
- No alert data is sent anywhere except the configured LLM provider and
  the destination channel (WhatsApp/Slack) the user sets up.

## MSSP / multi-tenant considerations

- Each `client_label` in `source_registry` should map to its own
  `send_to` — never mix two clients' events into one digest.
- Access to the Postgres instance and n8n instance itself should be
  scoped per the MSSP's own infrastructure security policy — SigOne
  doesn't add tenant isolation beyond the schema-level `source_id`/
  `client_label` separation.

---

# 10. MVP requirements

*(unchanged from the original scope — see section 3 above)*

---

# 11. Roadmap

## v0.1 — Core pipeline, one preset
- Repo scaffolding: methodology/, sources/, docs/, db/schema.sql
- Generic webhook ingestion + raw storage
- Wazuh Source Card + mapping preset (closest to Eky's existing homelab
  SOC stack)
- `security_events` schema + dedupe
- Scheduled digest workflow (reused pattern from reference project)
- Telegram delivery (default channel — bot token + chat_id, no gateway
  needed); WhatsApp delivery (reuse go-wa) as an optional alt if desired
- Error alert workflow
- Fixture-based mapping tests for the Wazuh preset

## v0.2 — Source-agnostic proof
- Mapping config admin form (n8n form, same pattern as "Manage Groups
  (Advanced)" in the reference project)
- Splunk HEC preset + generic-JSON preset, each with a Source Card
- Severity normalization documented per source
- MITRE passthrough logic (for sources that provide it) + policy doc

## v0.3 — Multi-tenant + more presets
- Sentinel preset (native MITRE tagging passthrough) + Source Card
- CrowdStrike preset + Source Card
- Multi-client source registry (MSSP use case)
- Slack delivery option alongside WhatsApp

## v1.0 — Stable
- Elastic preset + Source Card
- `docs/mapping-config-spec.md` finalized so users can write their own
  preset for an unsupported SIEM without touching core workflow logic
- Full documentation site pass + sample digest for portfolio use
- CHANGELOG.md covering v0.1 → v1.0

---

# 12. Portfolio positioning

> SigOne is a source-agnostic security alert digest pipeline built on
> n8n, Postgres, and structured LLM output. It normalizes alerts from any
> SIEM/XDR into a common schema and delivers a daily brief — severity
> breakdown, top offenders, and MITRE ATT&CK context — to WhatsApp or
> Slack. Built to survive a SIEM migration: swapping Wazuh for Sentinel
> means adding a mapping config, not rebuilding the pipeline.

This pairs naturally with PCAPCase in a portfolio: PCAPCase shows deep
single-artifact forensic analysis (packet captures), SigOne shows
operational/aggregation-level security engineering (alert triage at scale
across tools) — together they cover both ends of a SOC analyst's actual
workday.

---

# 13. Initial implementation handoff

Use this prompt when handing the project to a build workflow:

> Build SigOne v0.1 following this PRD. Start with repository scaffolding
> (methodology/, sources/wazuh/, docs/, db/schema.sql, README per section
> 5), then adapt the reference n8n project's ingest/digest/error-alert
> workflow pattern: generic webhook ingestion with per-source mapping
> config lookup, Wazuh mapping preset with its Source Card, the
> `security_events`/`source_registry`/`sitrep_runs` schema, a scheduled
> digest workflow using structured LLM output (topics/top_offenders/
> action_items/mitre_seen), and Telegram Bot API delivery as the default
> channel (WhatsApp via go-wa optional). Never invent
> MITRE ATT&CK mappings from raw alert text — pass through only what the
> source provides, leave the field null otherwise. Keep all secrets in
> n8n credentials, never in workflow JSON. Ship fixture-based mapping
> tests proving a sample Wazuh payload normalizes to the expected
> `security_events` row before calling v0.1 done.
