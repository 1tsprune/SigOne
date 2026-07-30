🛡️ *SigOne — Daily Brief*
📅 2026-07-30 | Source: mixed-tenant-prod | Client: Org Alpha

Severity breakdown: 0 critical, 2 high, 0 medium, 0 low
Top rule: Multiple failed SSH logins
Top source IP: 203.0.113.44

MITRE ATT&CK seen today: T1078.004 - Cloud Accounts (Initial Access)

Action items:
- Investigate SSH failures on db-01 and verify if firewall blocks are necessary for 203.0.113.44.
- Force MFA token reset for the Azure identity tied to AZ-WEB-01.

