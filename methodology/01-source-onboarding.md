# Methodology: Source Onboarding

A primary goal of SigOne is to handle any SIEM without needing new hardcoded logic in the ingestion workflow. 

When onboarding a new source, follow these steps:

1. **Understand the Source Data:** Examine the raw JSON payload the SIEM generates. Identify where it stores severity, rule names, descriptions, timestamps, IP addresses, and hostnames.
2. **Draft the Source Card:** Create a `source-card.md` file documenting the delivery mechanism, native MITRE tagging support, its specific severity scale, available fields, and known gaps.
3. **Write the Mapping Config:** Create a `mapping.json` file. Use JSONPath expressions to map fields from the raw payload into the generic SigOne schema (`severity`, `rule_name`, `description`, etc.). Define the `severity_scale` block to align the source's native severities with SigOne's internal enum (critical/high/medium/low).
4. **Register the Source:** Add the source's details and mapping config to the `source_registry` table in the Postgres database.
5. **Test the Mapping:** Run a sample webhook payload against the `sigone-ingest` workflow to ensure fields correctly populate the database.
