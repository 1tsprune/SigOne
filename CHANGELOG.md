# Changelog

All notable changes to this project will be documented in this file.

## [v1.0.0] - Stable Release
### Added
- **Elastic Security Preset**: Native JSONPath configurations parsing Elastic ECS webhook payloads, correctly handling the `threat` array objects.
- **Completed Documentation**: Finalized the `docs/mapping-config-spec.md` with concrete array indexing (`[0]`), special character escaping (`$.['@timestamp']`), and hashing fallback semantics to allow building unsupported SIEM presets without editing core logic.
- **Refined Examples**: Updated `examples/sample-digest.md` to reflect a multi-source output, proving mixed MITRE tag integration across the digest framework.

## [v0.3.0] - Multi-tenant + More Presets
### Added
- **Sentinel Preset**: Mapped native Microsoft Sentinel Logic App formats, intentionally passing through `additionalData` MITRE array tags into SigOne natively.
- **CrowdStrike Preset**: Mapped standard Falcon streaming payloads to the common schema, passing its native MITRE scoring.
- **Slack Delivery**: Extended the digest routing node to support native `n8n-nodes-base.slack` endpoints.
- **Multi-Tenant Isolation**: Leveraged the `client_label` column in SQL queries and the LLM prompt contexts to guarantee MSSP event isolation during batch iteration, preventing cross-tenant data leakage inside digests. 

## [v0.2.0] - Source-Agnostic Proof
### Added
- **Splunk HEC Preset**: Created mapping logic for generic Splunk Core / ES webhook alert actions.
- **Generic JSON Preset**: Created an open-ended generic mapping template for entirely custom applications.
- **String Mapping Severity Translation**: Introduced the `string_map` directive inside the `severity_scale` configuration block to handle non-integer source severities (like `high`, `fatal`, etc).
- **Admin Configuration Workflow**: Built an n8n Webhook-powered form API (`sigone-admin.json`) that manages `source_registry` entries. Features `add_update`, `list`, and soft-deletes via `remove` (retains historical logs).

## [v0.1.0] - Core Pipeline MVP
### Added
- **Database Schema**: Stood up `security_events`, `source_registry`, and `sitrep_runs` enforcing deduplication logic via PostgreSQL constraints.
- **Core n8n Workflows**: Built `sigone-ingest.json`, `sigone-daily-digest.json`, and `sigone-error-alert.json`. Separated real-time webhook parsing from batch digest processing.
- **Wazuh Preset**: Shipped the first configuration file (`mapping.json` + `source-card.md`) parsing Wazuh rule severities (`wazuh_level`).
- **Telegram Delivery**: Base messaging delivery natively handled via the Telegram bot node in the digest pipeline. 
- **Methodology Docs**: Outlined the core thesis behind strict MITRE passthrough rules (no LLM hallucination).
