# Splunk (via HEC)

## Delivery mechanism
Webhook (Splunk sending an alert action payload to SigOne's generic webhook).

## Native MITRE tagging
No — unless explicitly configured via Splunk Enterprise Security (ES) or custom alert actions. If your Splunk alerts do not include custom fields for `mitre_technique` or `mitre_tactic`, they will remain null in SigOne.

## Severity scale
Splunk alert payloads (especially from Splunk ES) typically include a `severity` field that is string-based, or an integer mapping to a string. The default mapping assumes standard string values (`critical`, `high`, `medium`, `low`, `info`).

If your alerts use integers or custom severity names, adjust the string mapping logic in `sources/splunk-hec/mapping.json` using the `string_map` type.

| Splunk Severity (String) | SigOne Severity |
| --- | --- |
| "critical", "fatal" | critical |
| "high", "severe" | high |
| "medium", "moderate" | medium |
| "low", "minor" | low |
| "informational", "info" | info |

## Fields available
*Standard Splunk alert action payload fields typically include:*
- `result.severity`, `result.urgency`, or custom fields like `result.priority`
- `search_name` (used as `rule_name`)
- `result._raw` (used as `description`)
- `result.src_ip`, `result.dest_ip`
- `result.host` (used as `hostname`)
- `result._time` (used as `event_time`)
- `sid` (Search ID, used as `event_id_source` for deduplication)

## Known gaps
- Severity location varies wildly depending on whether the alert comes from Splunk Core or Splunk ES. You may need to change `"severity": "$.result.severity"` to `"$.result.urgency"` depending on your setup.
- MITRE context requires Splunk ES and specific mappings in your search results.

## Mapping file
`sources/splunk-hec/mapping.json`
