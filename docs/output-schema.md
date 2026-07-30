# Output Schema

This document defines the schema for data at rest and in transit.

## Database: `security_events`

| Column | Type | Nullable | Description |
| --- | --- | --- | --- |
| `event_id` | `TEXT` (PK) | No | Deduplication key. Source-provided or hashed from key fields. |
| `source_id` | `TEXT` | No | Identifier from `source_registry`. |
| `source_type` | `TEXT` | No | Vendor/format (e.g., `wazuh`, `sentinel`). |
| `received_at` | `TIMESTAMPTZ` | No | Time SigOne ingested the event (defaults to `NOW()`). |
| `event_time` | `TIMESTAMPTZ` | Yes | Original alert timestamp provided by the source. |
| `severity` | `TEXT` | Yes | Normalized (`critical`, `high`, `medium`, `low`, `info`). |
| `rule_name` | `TEXT` | Yes | Human-readable rule description. |
| `description` | `TEXT` | Yes | Extended details or full log line. |
| `src_ip` | `TEXT` | Yes | Source IP address. |
| `dst_ip` | `TEXT` | Yes | Destination IP address. |
| `hostname` | `TEXT` | Yes | Affected hostname/agent name. |
| `mitre_technique` | `TEXT` | Yes | Extracted ATT&CK technique (e.g., T1110). Null if missing. |
| `mitre_tactic` | `TEXT` | Yes | Extracted ATT&CK tactic. Null if missing. |
| `raw` | `JSONB` | No | Complete, unmodified JSON payload from the source webhook. |

## Database: `source_registry`

| Column | Type | Nullable | Description |
| --- | --- | --- | --- |
| `source_id` | `TEXT` (PK) | No | Unique ID (e.g., `wazuh-client-a`). |
| `source_type` | `TEXT` | No | Used for identifying the base preset. |
| `mapping_config`| `JSONB` | No | The JSONPath mapping definitions. |
| `active` | `BOOLEAN` | No | If false, ignored during daily digest runs. Default `TRUE`. |
| `send_channel` | `TEXT` | No | Digest delivery channel (`telegram`, `whatsapp`, `slack`). |
| `send_to` | `TEXT` | Yes | Target identifier (Telegram chat_id, phone number, etc.). |
| `client_label` | `TEXT` | Yes | For MSSP multi-tenant grouping. |

## Database: `sitrep_runs`

| Column | Type | Nullable | Description |
| --- | --- | --- | --- |
| `run_date` | `DATE` (PK) | No | Date the digest covers. |
| `source_id` | `TEXT` (PK) | No | Source processed in this run. |
| `status` | `TEXT` | No | `success`, `empty`, `error`. |
| `event_count` | `INT` | No | Total events processed in the digest. |
| `created_at` | `TIMESTAMPTZ`| No | Timestamp of the run execution. |

## Digest Message Schema (LLM Structured Output)

The LLM is constrained to output JSON matching this schema:

```json
{
  "topics": [
    {
      "theme": "string",
      "summary": "string"
    }
  ],
  "top_offenders": [
    {
      "entity": "string (IP or Hostname)",
      "reason": "string"
    }
  ],
  "action_items": [
    "string"
  ],
  "mitre_seen": [
    "string (e.g., T1110 - Brute Force)"
  ]
}
```
