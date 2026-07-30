# Wazuh

## Delivery mechanism
Webhook (via Wazuh's integrator/webhook module) or API poll.

## Native MITRE tagging
No — Wazuh rules require manual ATT&CK tagging in the rule definition itself. If your ruleset doesn't tag rules natively (or via custom tags we map to), `mitre_technique` stays null.

## Severity scale
Wazuh uses `rule.level` (0-15+, integer). Mapping to SigOne's critical/high/medium/low is NOT 1:1 across ruleset customizations — the default mapping assumes an unmodified default ruleset:

| Wazuh level | SigOne severity |
| --- | --- |
| 12+ | critical |
| 8-11 | high |
| 4-7 | medium |
| 0-3 | low |

If your organization has customized rule levels, adjust `sources/wazuh/mapping.json`'s `severity_scale` block before relying on this mapping — do not assume the default table above applies to a heavily customized Wazuh deployment.

## Fields available
- `rule.level`, `rule.description`, `rule.id`
- `agent.name`, `agent.id`
- `data.srcip`, `data.dstip` (when present — not all rules populate these)
- `full_log` (raw log line)
- `timestamp`

## Known gaps
- No native MITRE tagging without custom rule configuration.
- `data.srcip`/`data.dstip` are rule-dependent — some alert types (e.g. file integrity monitoring) won't have network fields at all.

## Mapping file
`sources/wazuh/mapping.json`
