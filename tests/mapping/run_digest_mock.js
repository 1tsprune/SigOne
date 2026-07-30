// A small mock script to simulate the daily digest LLM rendering process based on our fixture.
const today = new Date().toISOString().split('T')[0];

const stats = {
  total_events: 1,
  critical_events: 0,
  high_events: 1,
  medium_events: 0,
  low_events: 0,
  top_rule: 'Multiple failed SSH logins',
  top_ip: '203.0.113.44'
};

const summary = {
  topics: [
    { theme: "Authentication Failures", summary: "Repeated SSH login failures on database server." }
  ],
  top_offenders: [
    { entity: "203.0.113.44", reason: "Source of multiple failed SSH login attempts against user 'admin'" }
  ],
  action_items: [
    "Investigate repeated SSH failures on db-01 (possible brute force)",
    "Block IP 203.0.113.44 at the perimeter firewall if unauthorized"
  ],
  mitre_seen: ["T1110.001 - Password Guessing"]
};

let msg = `🛡️ *SigOne — Daily Brief*\n`;
msg += `📅 ${today} | Source: wazuh-prod\n\n`;
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