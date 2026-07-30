# Elastic Security

## Delivery mechanism
Webhook connector configured within Kibana/Elastic Rules. The payload is customizable, but this mapping assumes the default standard Elastic Common Schema (ECS) fields are sent in the alert body.

## Native MITRE tagging
Partial — depends entirely on rule configuration. Some Elastic SIEM rules are natively mapped to MITRE ATT&CK (e.g., `threat.tactic.name`, `threat.technique.name`), while custom or simple threshold rules may omit them entirely.

SigOne's mapping configuration gracefully attempts to extract these fields. If a rule does not output them, SigOne falls back to leaving the `mitre_technique` and `mitre_tactic` fields null. It will **not** attempt to guess the technique based on the alert description.

## Severity scale
Elastic typically outputs string-based severities ("critical", "high", "medium", "low") or corresponding risk scores. The default mapping utilizes the standard string map.

| Elastic Severity | SigOne Severity |
| --- | --- |
| "critical" | critical |
| "high" | high |
| "medium" | medium |
| "low" | low |

## Fields available
*Assuming a standard ECS-formatted webhook payload:*
- `kibana.alert.rule.level` (used as `severity`)
- `kibana.alert.rule.name` (used as `rule_name`)
- `kibana.alert.reason` (used as `description`)
- `source.ip` (used as `src_ip`)
- `destination.ip` (used as `dst_ip`)
- `host.name` (used as `hostname`)
- `@timestamp` (used as `event_time`)
- `kibana.alert.uuid` (used as `event_id_source`)
- `threat.tactic.name`
- `threat.technique.name`

## Known gaps
- Elastic's webhook bodies are highly customizable. If an administrator edits the connector to omit ECS context (like `source.ip`), those fields will record as null in SigOne.
- Threat objects in Elastic are often arrays (e.g. multiple techniques tied to one alert). The mapping targets the first index `[0]` to keep the common schema flat and concise.

## Mapping file
`sources/elastic/mapping.json`