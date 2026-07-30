# Methodology: Normalization Model

SigOne normalizes alerts to ensure consistent reporting across disparate sources (e.g., merging Wazuh and Sentinel alerts into a single digest). 

The normalization model relies on these core tenets:

- **JSONPath Extraction:** We use JSONPath (`$.path.to.field`) in our `mapping_config` to extract data from raw JSON. This keeps extraction logic configurable data rather than code.
- **Common Schema:** Extracted data must map to the structured `security_events` table. Fields like `src_ip`, `dst_ip`, and `hostname` provide common pivot points regardless of where the alert came from.
- **Raw Retention:** The original, unmodified JSON payload is *always* stored in the `raw` column of the database. Normalization is a one-way lossy process, so we keep the raw data to enable downstream auditing, historical queries, and debugging of mapping failures.
- **Deduplication:** A consistent `event_id` is required to handle at-least-once webhook delivery mechanisms. If the source doesn't provide a unique ID, the mapping config should specify fields to hash to generate one (`event_id_source`).
