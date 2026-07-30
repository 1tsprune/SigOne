# Installation

Follow these steps to stand up SigOne in your environment.

## Prerequisites

1. **n8n Instance:** A running instance of n8n (v1.0+ recommended).
2. **PostgreSQL Database:** A running Postgres instance.
3. **Telegram Bot Token:** Create a new bot via [@BotFather](https://t.me/botfather) on Telegram and save the token.
4. **OpenAI API Key:** For the summarization step (GPT-4 or GPT-4o recommended for structured output reliability).

## 1. Database Setup

Execute the schema file against your Postgres database to create the required tables:

```bash
psql -U your_user -d your_db -f db/schema.sql
```

## 2. Configure Your First Source

Before n8n can process alerts, you must register the source in the database. For example, to set up Wazuh to send to your Telegram chat:

```sql
INSERT INTO source_registry (source_id, source_type, send_channel, send_to, mapping_config)
VALUES (
  'wazuh-prod', 
  'wazuh', 
  'telegram', 
  '-1001234567890', -- Replace with your Telegram Chat ID
  '{
    "severity": "$.rule.level",
    "rule_name": "$.rule.description",
    "description": "$.full_log",
    "src_ip": "$.data.srcip",
    "hostname": "$.agent.name",
    "event_time": "$.timestamp",
    "event_id_source": "$.id",
    "mitre_technique": "$.rule.mitre.id[0]",
    "mitre_tactic": "$.rule.mitre.tactic[0]",
    "severity_scale": { "type": "wazuh_level", "critical": 12, "high": 8, "medium": 4 }
  }'
);
```

## 3. Import Workflows into n8n

1. Open your n8n workspace.
2. Create a new workflow, click **Import from File**, and select `workflows/sigone-ingest.json`.
3. Repeat the process for `workflows/sigone-daily-digest.json` and `workflows/sigone-error-alert.json`.

## 4. Configure Credentials

In n8n, go to **Credentials** and set up:
- **Postgres:** Connect to the database you set up in Step 1.
- **Telegram API:** Enter the Bot Token from @BotFather.
- **Header Auth:** Create a secret token (e.g., `Bearer my-secret-token`) that your SIEM will use to authenticate with the ingest webhook.
- **OpenAI API:** Enter your OpenAI API key.

*Ensure all nodes in the imported workflows are mapped to these credentials.*

## 5. Point Your SIEM Webhook

In your SIEM (e.g., Wazuh `ossec.conf` integration), configure a webhook to point to the `sigone-ingest` Production URL. 

Ensure you include two things:
1. The authentication header you configured in Step 4.
2. A `source_id` query parameter matching the ID you inserted into the database (e.g., `?source_id=wazuh-prod`).

You are now ready to receive alerts! The daily digest will run automatically at its scheduled time, or you can trigger it manually in n8n.
