# Generic JSON Source

## Delivery mechanism
Any webhook that can send a JSON payload via HTTP POST.

## Native MITRE tagging
Depends entirely on the source sending the payload. If the JSON payload contains fields for MITRE techniques/tactics, map them in the `mapping.json`. Otherwise, they default to null.

## Severity scale
Because this is a generic connector, the severity scale logic is entirely up to you. You can use integer thresholds (`wazuh_level`) or string mapping (`string_map`). The default template provided assumes string-based severities.

| Payload Field Value | SigOne Severity |
| --- | --- |
| mapped in config | critical |
| mapped in config | high |
| mapped in config | medium |
| mapped in config | low |

## Fields available
Any valid JSONPath that exists in your payload can be extracted.

**Required fields to map:**
- `severity` (Path to the field denoting severity)
- `event_id_source` (Path to a unique ID. If one does not exist, SigOne will hash the entire payload to create a deduplication key).

## Known gaps
- If your source does not provide a reliable unique ID, rapid duplicate webhooks with identical payload bodies will be dropped by SigOne's payload hashing mechanism.
- If your JSON schema changes frequently without notice, the JSONPath extraction will fail and fields will insert as null.

## Mapping file
`sources/generic-json/mapping.json`
