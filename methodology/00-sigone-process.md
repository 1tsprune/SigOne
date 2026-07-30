# Methodology: SigOne Process

SigOne sits between the chaotic output of a SIEM and the focused attention of a human analyst. It is an **aggregator and summarizer**, not a primary detection engine or a log storage platform.

The core process operates on two distinct, decoupled timelines:

1. **Ingestion (Real-time):** Events arrive via webhooks. We immediately map them using a deterministic JSONPath configuration to our internal `security_events` schema, applying deduplication (based on `event_id`) and recording the original raw payload for auditability.
2. **Summarization (Scheduled batch):** A daily (or hourly) process queries the normalized events. This is where we aggregate statistics (using strict SQL, not LLM inference) and pass an optimized, structured context to an LLM to generate action items and topical summaries.

Decoupling ingestion from summarization ensures that webhook spikes don't trigger massive, expensive LLM calls, and it isolates failures: if an LLM API is down, the SIEM continues pushing alerts into the Postgres queue without data loss.
