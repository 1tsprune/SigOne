# Methodology: MITRE ATT&CK Passthrough Policy

SigOne operates under a strict "no inventing context" rule regarding MITRE ATT&CK tactics and techniques. 

- **If the source provides MITRE tags:** We extract them via the mapping configuration (e.g., `$.rule.mitre.id`) and store them in the `mitre_technique` and `mitre_tactic` columns.
- **If the source does NOT provide MITRE tags:** We leave the fields `NULL`.

**Why?**
We do not use LLMs to guess or backfill MITRE mappings based on alert descriptions. Guessing techniques from raw alert text is notoriously inaccurate and introduces hallucinations into security metrics. It violates the trust analysts place in the digest. 

If an organization wants MITRE tagging for a source like Wazuh (which doesn't natively map all rules), they must tag the rules within Wazuh itself. SigOne will then faithfully pass those tags through.
