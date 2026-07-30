# Mapping Config Spec

A mapping configuration is a JSON object defining how to translate a source's raw JSON payload into SigOne's `security_events` schema.

## Syntax and Patterns

Mappings use standard JSONPath syntax (e.g., `$.path.to.field`).

**Common Extraction Patterns:**
- **Standard Fields:** `$.alert.title`
- **Array Indexes:** If a source provides data in arrays (like Sentinel or Elastic), use index brackets to flatten it into the common schema: `$.properties.additionalData.techniques[0]`.
- **Special Characters in Keys:** If a key has special characters (like Elastic's `@timestamp`), it can typically be addressed directly via `$.@timestamp` thanks to the underlying Lodash extraction layer safely parsing the string.
- **Missing Fields (Null Fallbacks):** SigOne's extraction logic safely ignores missing fields. If you define `"mitre_technique": "$.threat.technique"` but a specific alert payload lacks the `threat` object, the field gracefully defaults to `null`. *Do not invent mappings or write fallback logic inside the JSONPath itself.*

## Required Fields

- `severity`: Path to the field containing the severity indicator.
- `severity_scale`: A block defining how to translate the source severity to SigOne's internal enum. See below.
- `event_id_source`: Path to a unique ID. 
  - **Deduplication Hashing:** If the source does not provide a reliable unique ID, map this field to an invalid path or leave it empty. The n8n ingestion workflow automatically falls back to generating a SHA256 hash of the entire payload body to serve as the deduplication key.

## Optional Fields

Map these if the source provides them; otherwise, they will naturally insert as `null`.

- `rule_name`
- `description`
- `src_ip`
- `dst_ip`
- `hostname`
- `event_time`
- `mitre_technique`
- `mitre_tactic`

## Severity Scale Definition

The `severity_scale` block handles translation from the source's native severity to SigOne's internal enum (`critical`, `high`, `medium`, `low`, `info`).

There are two supported types:

### 1. Integer Thresholds (`wazuh_level`)
Use this when the source provides a numeric severity score. The values defined in the config are the minimum thresholds for that tier (inclusive).

```json
"severity_scale": {
  "type": "wazuh_level", // Indicates a numeric >= threshold check
  "critical": 12,        // >= 12 is critical
  "high": 8,             // >= 8 is high
  "medium": 4            // >= 4 is medium
                         // anything lower is low
}
```

### 2. String Mapping (`string_map`)
Use this when the source provides string-based severities (e.g., Splunk, Sentinel, CrowdStrike). The block defines an array of acceptable strings for each internal severity tier. Case-insensitive.

```json
"severity_scale": {
  "type": "string_map",
  "critical": ["critical", "fatal", "p1"],
  "high": ["high", "severe", "p2"],
  "medium": ["medium", "moderate", "p3"],
  "low": ["low", "minor", "p4"]
  // anything unmapped defaults to info
}
```

## Testing

Use the scripts in `tests/mapping/` to validate a new `mapping.json` against a fixture payload before deploying it to production.
