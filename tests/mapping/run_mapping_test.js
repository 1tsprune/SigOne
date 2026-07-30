const fs = require('fs');
const path = require('path');
const jsonpath = require('jsonpath');
const crypto = require('crypto');

// Load fixture and mapping
const fixturePath = path.join(__dirname, '../fixtures/wazuh-alert.json');
const mappingPath = path.join(__dirname, '../../sources/wazuh/mapping.json');

const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

console.log("=== SigOne Mapping Test ===");
console.log(`Payload: ${fixturePath}`);
console.log(`Mapping: ${mappingPath}\n`);

// Helper to extract via jsonpath
function extract(path, data) {
    if (!path) return null;
    try {
        const result = jsonpath.value(data, path);
        return result !== undefined ? result : null;
    } catch (e) {
        return null;
    }
}

// 1. Map generic fields
const normalized = {
    source_id: 'wazuh-test',
    source_type: 'wazuh',
    rule_name: extract(mapping.rule_name, payload),
    description: extract(mapping.description, payload),
    src_ip: extract(mapping.src_ip, payload),
    dst_ip: extract(mapping.dst_ip, payload),
    hostname: extract(mapping.hostname, payload),
    event_time: extract(mapping.event_time, payload),
    mitre_technique: extract(mapping.mitre_technique, payload),
    mitre_tactic: extract(mapping.mitre_tactic, payload),
    raw: payload
};

// 2. Map event_id
const eventIdSource = extract(mapping.event_id_source, payload);
if (eventIdSource) {
    normalized.event_id = String(eventIdSource);
} else {
    // Basic hash fallback
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(payload));
    normalized.event_id = hash.digest('hex');
}

// 3. Map severity based on severity_scale block
const rawSeverity = extract(mapping.severity, payload);
let finalSeverity = 'info';

if (mapping.severity_scale && mapping.severity_scale.type === 'wazuh_level') {
    const level = parseInt(rawSeverity, 10);
    if (!isNaN(level)) {
        if (level >= mapping.severity_scale.critical) {
            finalSeverity = 'critical';
        } else if (level >= mapping.severity_scale.high) {
            finalSeverity = 'high';
        } else if (level >= mapping.severity_scale.medium) {
            finalSeverity = 'medium';
        } else {
            finalSeverity = 'low';
        }
    }
} else {
    finalSeverity = rawSeverity ? String(rawSeverity).toLowerCase() : 'info';
}
normalized.severity = finalSeverity;

console.log("=== Resulting Normalized Row ===");
console.log(JSON.stringify(normalized, null, 2));
