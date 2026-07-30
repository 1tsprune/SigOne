# Limitations

SigOne is designed with specific boundaries. Understanding these limitations is critical for proper deployment.

- **We summarize, we do not detect:** SigOne only summarizes what the upstream SIEM has *already* alerted on. It does not ingest raw logs and generate new detections. If your SIEM missed it, SigOne won't see it.
- **MITRE coverage depends on the source:** We pass through MITRE ATT&CK tags; we never invent them. If your SIEM (like default Wazuh) doesn't tag its rules, the digest's MITRE section will be empty. We will not use LLMs to hallucinate techniques based on log text.
- **Severity normalization assumes default configs:** The default `severity_scale` mappings provided for sources (like Wazuh) assume standard, out-of-the-box configurations. If you have heavily customized your rule levels, you *must* adjust the mapping configuration in the `source_registry`.
- **Action items are suggestions:** The LLM-generated action items in the digest are triage suggestions based on aggregated context. They are *not* verified remediation steps. A human analyst must still review the underlying alerts in the SIEM console before taking destructive action.
- **No real-time alerting:** SigOne is a *batch summarization* tool (daily or hourly). It is not a replacement for immediate page-outs on critical incidents (e.g., PagerDuty).
