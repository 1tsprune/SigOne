const fs = require('fs');
const path = require('path');
const jsonpath = require('jsonpath');
const crypto = require('crypto');

// Define tests to run
const testCases = [
    {
        name: 'Wazuh (With MITRE)',
        fixture: path.join(__dirname, '../fixtures/wazuh-alert.json'),
        mapping: path.join(__dirname, '../../sources/wazuh/mapping.json'),
        sourceType: 'wazuh'
    },
    {
        name: 'Wazuh (No MITRE fallback)',
        fixture: path.join(__dirname, '../fixtures/wazuh-alert-no-mitre.json'),
        mapping: path.join(__dirname, '../../sources/wazuh/mapping.json'),
        sourceType: 'wazuh'
    },
    {
        name: 'Splunk HEC (With MITRE)',
        fixture: path.join(__dirname, '../fixtures/splunk-alert.json'),
        mapping: path.join(__dirname, '../../sources/splunk-hec/mapping.json'),
        sourceType: 'splunk-hec'
    },
    {
        name: 'Splunk HEC (No MITRE fallback)',
        fixture: path.join(__dirname, '../fixtures/splunk-alert-no-mitre.json'),
        mapping: path.join(__dirname, '../../sources/splunk-hec/mapping.json'),
        sourceType: 'splunk-hec'
    },
    {
        name: 'Generic JSON',
        fixture: path.join(__dirname, '../fixtures/generic-alert.json'),
        mapping: path.join(__dirname, '../../sources/generic-json/mapping.json'),
        sourceType: 'generic-json'
    }
];

console.log("=== SigOne Mapping Tests ===\n");

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

testCases.forEach(test => {
    const payload = JSON.parse(fs.readFileSync(test.fixture, 'utf8'));
    const mapping = JSON.parse(fs.readFileSync(test.mapping, 'utf8'));
    
    console.log(`--- Testing: ${test.name} ---`);
    console.log(`Payload: ${path.basename(test.fixture)}`);
    console.log(`Mapping: ${path.basename(test.mapping)}\n`);

    // 1. Map generic fields
    const normalized = {
        source_id: `test-${test.sourceType}`,
        source_type: test.sourceType,
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
            if (level >= mapping.severity_scale.critical) finalSeverity = 'critical';
            else if (level >= mapping.severity_scale.high) finalSeverity = 'high';
            else if (level >= mapping.severity_scale.medium) finalSeverity = 'medium';
            else finalSeverity = 'low';
        }
    } else if (mapping.severity_scale && mapping.severity_scale.type === 'string_map') {
        const strVal = rawSeverity ? String(rawSeverity).toLowerCase() : '';
        if (mapping.severity_scale.critical && mapping.severity_scale.critical.includes(strVal)) finalSeverity = 'critical';
        else if (mapping.severity_scale.high && mapping.severity_scale.high.includes(strVal)) finalSeverity = 'high';
        else if (mapping.severity_scale.medium && mapping.severity_scale.medium.includes(strVal)) finalSeverity = 'medium';
        else if (mapping.severity_scale.low && mapping.severity_scale.low.includes(strVal)) finalSeverity = 'low';
        else finalSeverity = 'info';
    } else {
        finalSeverity = rawSeverity ? String(rawSeverity).toLowerCase() : 'info';
    }
    normalized.severity = finalSeverity;

    console.log(JSON.stringify(normalized, null, 2));
    console.log("\n");
});
