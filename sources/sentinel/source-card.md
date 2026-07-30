# Microsoft Sentinel

## Delivery mechanism
Logic App triggered by Sentinel Incident creation, posting a JSON payload to SigOne's webhook, or via Graph Security API alerts push.

## Native MITRE tagging
Yes — unlike Wazuh or Splunk Core, Microsoft Sentinel actively tags incidents with MITRE Tactics and Techniques natively in its engine. The SigOne mapping configuration explicitly passes these through (`Tactics[]` and `Techniques[]`). 

*Note:* Even though Sentinel supports native tagging, specific custom analytics rules might omit them. If an incident payload lacks these tags, SigOne will fall back to leaving the fields null (no invented mappings).

## Severity scale
Sentinel uses strict string enumerations for incident severity.

| Sentinel Severity | SigOne Severity |
| --- | --- |
| "High" | critical (or high, depending on org preference, default is high) |
| "Medium" | medium |
| "Low" | low |
| "Informational" | info |

## Fields available
*Standard Sentinel Logic App incident payload fields typically include:*
- `properties.severity`
- `properties.title` (used as `rule_name`)
- `properties.description`
- `properties.createdTimeUtc` (used as `event_time`)
- `name` (used as `event_id_source`)
- `properties.additionalData.tactics`
- `properties.additionalData.techniques`

## Known gaps
- Network fields (`src_ip`, `dst_ip`) and `hostname` are often buried inside Sentinel's `entities` array. Extracting them robustly requires either a pre-processing step in the Logic App to flatten them, or advanced JSONPath mapping. The default mapping provided attempts to pull from a flattened structure assumed to be passed by the Logic App.
- Sentinel's "High" severity is often mapped to SigOne's "High", leaving "Critical" unused unless an organization customizes the mapping for specific high-priority alerts.

## Mapping file
`sources/sentinel/mapping.json`