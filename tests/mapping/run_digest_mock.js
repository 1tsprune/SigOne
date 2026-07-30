// A mock script to simulate the daily digest LLM rendering process based on a multi-source fixture run.
const today = new Date().toISOString().split('T')[0];

const stats = {
  total_events: 2,
  critical_events: 0,
  high_events: 2,
  medium_events: 0,
  low_events: 0,
  top_rule: 'Multiple failed SSH logins',
  top_ip: '203.0.113.44'
};

const summary = {
  topics: [
    { theme: "Authentication Failures", summary: "Repeated SSH login failures originating from 203.0.113.44 targeting database servers." },
    { theme: "Anomalous Travel", summary: "Impossible travel activity detected across distinct geographic locations for a cloud identity." }
  ],
  top_offenders: [
    { entity: "203.0.113.44", reason: "Source of multiple failed SSH login attempts." },
    { entity: "AZ-WEB-01", reason: "Host tied to impossible travel identity authentication." }
  ],
  action_items: [
    "Investigate SSH failures on db-01 and verify if firewall blocks are necessary for 203.0.113.44.",
    "Force MFA token reset for the Azure identity tied to AZ-WEB-01."
  ],
  mitre_seen: ["T1078.004 - Cloud Accounts (Initial Access)"] // Sentinel provided this natively; Wazuh provided none.
};

const source = {
  source_id: 'mixed-tenant-prod',
  client_label: 'Org Alpha'
};

let msg = `🛡️ *SigOne — Daily Brief*\n`;
const clientString = source.client_label ? ` | Client: ${source.client_label}` : '';
msg += `📅 ${today} | Source: ${source.source_id}${clientString}\n\n`;

msg += `Severity breakdown: ${stats.critical_events} critical, ${stats.high_events} high, ${stats.medium_events} medium, ${stats.low_events} low\n`;
msg += `Top rule: ${stats.top_rule || 'N/A'}\n`;
msg += `Top source IP: ${stats.top_ip || 'N/A'}\n\n`;

if (summary.mitre_seen && summary.mitre_seen.length > 0) {
  msg += `MITRE ATT&CK seen today: ${summary.mitre_seen.join(', ')}\n\n`;
}

msg += `Action items:\n`;
if (summary.action_items && summary.action_items.length > 0) {
  summary.action_items.forEach(item => {
    msg += `- ${item}\n`;
  });
} else {
  msg += `- None identified.\n`;
}

console.log(msg);