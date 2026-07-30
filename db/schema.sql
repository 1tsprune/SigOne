-- SigOne Database Schema (v0.1)

-- 1. Security Events Table
-- Stores the normalized alerts from any source, plus the raw payload for audit.
CREATE TABLE IF NOT EXISTS security_events (
  event_id        TEXT PRIMARY KEY,   -- Deduplication key (source-provided or hashed)
  source_id       TEXT NOT NULL,      -- e.g., 'wazuh-prod', 'sentinel-corp'
  source_type     TEXT NOT NULL,      -- e.g., 'wazuh', 'splunk', 'sentinel'
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_time      TIMESTAMPTZ,        -- Original alert timestamp from the source
  severity        TEXT,               -- Normalized: critical/high/medium/low/info
  rule_name       TEXT,
  description     TEXT,
  src_ip          TEXT,
  dst_ip          TEXT,
  hostname        TEXT,
  mitre_technique TEXT,               -- Nullable: only populated if source natively provides it
  mitre_tactic    TEXT,               -- Nullable
  raw             JSONB NOT NULL      -- Original, unmodified JSON payload for debugging
);

-- Index for daily digest queries (filtering by source and time)
CREATE INDEX IF NOT EXISTS idx_security_events_source_time 
  ON security_events(source_id, received_at);

-- 2. Source Registry Table
-- Drives the ingestion normalization and digest routing dynamically.
CREATE TABLE IF NOT EXISTS source_registry (
  source_id       TEXT PRIMARY KEY,   -- e.g., 'wazuh-client-a'
  source_type     TEXT NOT NULL,      -- 'wazuh', 'splunk', etc.
  mapping_config  JSONB NOT NULL,     -- The JSONPath mapping definition for this source
  active          BOOLEAN DEFAULT TRUE,
  send_channel    TEXT NOT NULL,      -- 'telegram', 'whatsapp', 'slack'
  send_to         TEXT,               -- chat_id, phone number, or channel ID
  client_label    TEXT                -- Optional grouping for MSSP multi-tenant use
);

-- 3. Sitrep Runs Table
-- Audit trail for daily summary generations.
CREATE TABLE IF NOT EXISTS sitrep_runs (
  run_date        DATE NOT NULL,
  source_id       TEXT NOT NULL,
  status          TEXT NOT NULL,      -- 'success', 'empty', 'error'
  event_count     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (run_date, source_id)
);

-- 4. Threat Intel Cache Table (v1.1)
-- Stores VirusTotal enrichment results to minimize API calls (4/min limit).
CREATE TABLE IF NOT EXISTS threat_intel_cache (
  indicator       TEXT PRIMARY KEY,   -- The IP, Domain, or Hash
  indicator_type  TEXT NOT NULL,      -- 'ip', 'domain', 'hash'
  vt_malicious    INT NOT NULL,       -- Count of vendors flagging as malicious
  vt_total        INT NOT NULL,       -- Total vendors checked
  vt_link         TEXT,               -- Link to VirusTotal report
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to easily clear old cache entries (e.g., older than 7 days)
CREATE INDEX IF NOT EXISTS idx_threat_intel_cache_date
  ON threat_intel_cache(last_checked_at);
