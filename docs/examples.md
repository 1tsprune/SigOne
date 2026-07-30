# Example Output

SigOne normalizes varying alert formats and generates a unified, structured daily digest.

## The Input (Wazuh Alert)

A SIEM like Wazuh might send this raw JSON via webhook when an SSH brute-force attempt occurs:

```json
{
  "timestamp": "2026-07-30T10:15:30.123+0000",
  "rule": {
    "level": 10,
    "description": "Multiple failed SSH logins",
    "id": "5716",
    "mitre": {
      "id": ["T1110.001"],
      "tactic": ["Credential Access"],
      "technique": ["Password Guessing"]
    }
  },
  "agent": {
    "id": "001",
    "name": "db-01"
  },
  "id": "1672534530.12345",
  "full_log": "Jul 30 10:15:30 db-01 sshd[1234]: Failed password for invalid user admin from 203.0.113.44 port 53422 ssh2",
  "data": {
    "srcip": "203.0.113.44",
    "dstuser": "admin"
  }
}
```

## The Normalization

Using the Wazuh mapping config, SigOne extracts the fields without running any custom workflow logic. The database stores the normalized version:

- **severity:** high (Wazuh level 10 maps to high)
- **rule_name:** Multiple failed SSH logins
- **src_ip:** 203.0.113.44
- **hostname:** db-01
- **mitre_technique:** T1110.001

## The Output (Telegram Digest)

During the daily scheduled run, SigOne queries the database to compute exact statistics, feeds the events into an LLM for summarization, and sends a formatted message to your configured channel. 

See `examples/sample-digest.md` for the actual rendered output.
