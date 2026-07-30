# Mapping Config Spec

A mapping configuration is a JSON object defining how to translate a source's raw JSON payload into SigOne's `security_events` schema.

## Syntax

Mappings use standard JSONPath syntax (`$.path.to.field`).

## Required Fields

- `severity`: Path to the field containing the severity indicator.
- `severity_scale`: A block defining how to translate the source severity to SigOne's internal enum. See below.
- `event_id_source`: Path to a unique ID. If the source does not provide a reliable unique ID, specify a list of paths to hash (e.g., `["$.timestamp", "$.rule.id", "$.agent.id"]`). *(Note: Hashing logic must be implemented in the n8n ingestion workflow).*

## Optional Fields

Map these if the source provides them; otherwise, omit them or leave them null in the database.

- `rule_name`
- `description`
- `src_ip`
- `dst_ip`
- `hostname`
- `event_time`
- `mitre_technique`
- `mitre_tactic`

## Severity Scale Definition

The `severity_scale` block handles translation.

**Integer Thresholds (e.g., Wazuh)**
```json
"severity_scale": {
  "type": "wazuh_level", // Indicates a numeric >= threshold check
  "critical": 12,        // >= 12 is critical
  "high": 8,             // >= 8 is high
  "medium": 4            // >= 4 is medium
                         // anything lower is low
}
```

*(String-based mapping specs will be added when supporting sources like Sentinel).*

## Testing

Use the scripts in `tests/mapping/` to validate a new `mapping.json` against a fixture payload before deploying it to production.
