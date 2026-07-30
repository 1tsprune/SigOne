# CrowdStrike Falcon

## Delivery mechanism
CrowdStrike Falcon Webhook connector (streaming alerts/detections).

## Native MITRE tagging
Yes — CrowdStrike heavily utilizes the MITRE ATT&CK framework and natively includes tactics and techniques in its detection payloads. SigOne extracts these directly (`tactic` and `technique`).

*Note:* As with all sources, if a specific low-level behavioral alert lacks a MITRE mapping in the CrowdStrike payload, SigOne defaults to null.

## Severity scale
CrowdStrike detections generally use a numeric `severity` score (0-100) or a string `severity_name` ("Critical", "High", "Medium", "Low"). The default SigOne mapping uses the string field `severity_name`.

| CrowdStrike Severity Name | SigOne Severity |
| --- | --- |
| "Critical" | critical |
| "High" | high |
| "Medium" | medium |
| "Low" | low |

## Fields available
*Standard CrowdStrike Falcon detection payload fields typically include:*
- `event.SeverityName` (used as `severity`)
- `event.Description` (used as `rule_name`)
- `event.ComputerName` (used as `hostname`)
- `event.DetectTimestamp` (used as `event_time`)
- `event.DetectId` (used as `event_id_source`)
- `event.Tactic`
- `event.Technique`
- `event.LocalIP` (used as `src_ip` depending on perspective)

## Known gaps
- `src_ip` vs `dst_ip` logic can be ambiguous depending on the directionality of the network detection (inbound vs outbound). The default mapping assumes `event.LocalIP` is the affected host's IP and maps it to `src_ip`.

## Mapping file
`sources/crowdstrike/mapping.json`