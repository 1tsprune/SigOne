const crypto = require('crypto');
const lodash = require('lodash');
const fs = require('fs');
const path = require('path');

// Mock Database
const source_registry = [
    { source_id: 'wazuh-prod', source_type: 'wazuh', client_label: 'Alpha', send_channel: 'telegram', send_to: '-100', active: true, mapping_config: JSON.parse(fs.readFileSync(path.join(__dirname, '../../sources/wazuh/mapping.json'), 'utf8')) },
    { source_id: 'splunk-prod', source_type: 'splunk-hec', client_label: 'Alpha', send_channel: 'telegram', send_to: '-100', active: true, mapping_config: JSON.parse(fs.readFileSync(path.join(__dirname, '../../sources/splunk-hec/mapping.json'), 'utf8')) },
    { source_id: 'sentinel-prod', source_type: 'sentinel', client_label: 'Beta', send_channel: 'slack', send_to: 'C200', active: true, mapping_config: JSON.parse(fs.readFileSync(path.join(__dirname, '../../sources/sentinel/mapping.json'), 'utf8')) },
    { source_id: 'crowdstrike-prod', source_type: 'crowdstrike', client_label: 'Alpha', send_channel: 'telegram', send_to: '-100', active: true, mapping_config: JSON.parse(fs.readFileSync(path.join(__dirname, '../../sources/crowdstrike/mapping.json'), 'utf8')) },
    { source_id: 'elastic-prod', source_type: 'elastic', client_label: 'Gamma', send_channel: 'telegram', send_to: '-300', active: true, mapping_config: JSON.parse(fs.readFileSync(path.join(__dirname, '../../sources/elastic/mapping.json'), 'utf8')) }
];

let security_events = [];
let sitrep_runs = [];

function extract(path, data) {
    if (!path) return null;
    try {
        const cleanPath = path.replace(/^\$\./, '').replace(/^\$\[\'/, '').replace(/\'\]$/, '').replace(/^\$\[\"/, '').replace(/\"\]$/, '');
        const result = lodash.get(data, cleanPath);
        return result !== undefined ? result : null;
    } catch (e) {
        return null;
    }
}

// 1. Simulate sigone-ingest for all 5 fixtures
const fixtures = [
    { source_id: 'wazuh-prod', path: path.join(__dirname, '../fixtures/wazuh-alert.json') },
    { source_id: 'splunk-prod', path: path.join(__dirname, '../fixtures/splunk-alert.json') },
    { source_id: 'sentinel-prod', path: path.join(__dirname, '../fixtures/sentinel-alert.json') },
    { source_id: 'crowdstrike-prod', path: path.join(__dirname, '../fixtures/crowdstrike-alert.json') },
    { source_id: 'elastic-prod', path: path.join(__dirname, '../fixtures/elastic-alert-mitre.json') },
];

console.log("=== RUNNING INGESTION ===");
fixtures.forEach(f => {
    const payload = JSON.parse(fs.readFileSync(f.path, 'utf8'));
    const source = source_registry.find(s => s.source_id === f.source_id);
    const mapping = source.mapping_config;

    const normalized = {
        source_id: source.source_id,
        source_type: source.source_type,
        rule_name: extract(mapping.rule_name, payload),
        description: extract(mapping.description, payload),
        src_ip: extract(mapping.src_ip, payload),
        dst_ip: extract(mapping.dst_ip, payload),
        hostname: extract(mapping.hostname, payload),
        event_time: extract(mapping.event_time, payload),
        mitre_technique: extract(mapping.mitre_technique, payload),
        mitre_tactic: extract(mapping.mitre_tactic, payload),
        received_at: new Date().toISOString()
    };

    const eventIdSource = extract(mapping.event_id_source, payload);
    if (eventIdSource) {
        normalized.event_id = String(eventIdSource);
    } else {
        const hash = crypto.createHash('sha256');
        hash.update(JSON.stringify(payload));
        normalized.event_id = hash.digest('hex');
    }

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

    // Dedupe (ON CONFLICT DO NOTHING)
    if (!security_events.find(e => e.event_id === normalized.event_id)) {
        security_events.push(normalized);
        console.log(`[Ingest] Successfully upserted ${normalized.event_id} (${normalized.source_id})`);
    } else {
        console.log(`[Ingest] Dedupe prevented duplicate for ${normalized.event_id}`);
    }
});

console.log(`\nTotal events in database: ${security_events.length}`);

console.log("\n=== RUNNING INGESTION RETRY (DEDUPLICATION CHECK) ===");
fixtures.forEach(f => {
    const payload = JSON.parse(fs.readFileSync(f.path, 'utf8'));
    const source = source_registry.find(s => s.source_id === f.source_id);
    const mapping = source.mapping_config;

    const normalized = {
        // ... omitted parsing logic ...
        source_id: source.source_id
    };

    const eventIdSource = extract(mapping.event_id_source, payload);
    if (eventIdSource) {
        normalized.event_id = String(eventIdSource);
    } else {
        const hash = crypto.createHash('sha256');
        hash.update(JSON.stringify(payload));
        normalized.event_id = hash.digest('hex');
    }

    // Dedupe (ON CONFLICT DO NOTHING)
    if (!security_events.find(e => e.event_id === normalized.event_id)) {
        security_events.push(normalized);
        console.log(`[Ingest] Successfully upserted ${normalized.event_id} (${normalized.source_id})`);
    } else {
        console.log(`[Ingest] Dedupe prevented duplicate for ${normalized.event_id} (${normalized.source_id})`);
    }
});

console.log(`\nTotal events in database after retry: ${security_events.length}`);

// 2. Simulate sigone-daily-digest
console.log("\n=== RUNNING DAILY DIGEST ===");
source_registry.forEach(source => {
    const events = security_events.filter(e => e.source_id === source.source_id);
    if (events.length === 0) return;

    console.log(`[Digest Iteration] ${source.source_id} (Client: ${source.client_label})`);
    const today = new Date().toISOString().split('T')[0];
    const clientString = source.client_label ? ` | Client: ${source.client_label}` : '';
    
    let msg = `🛡️ *SigOne — Daily Brief*\n`;
    msg += `📅 ${today} | Source: ${source.source_id}${clientString}\n\n`;
    msg += `Severity breakdown: 0 critical, ${events.length} high, 0 medium, 0 low\n`; // mocked stats
    msg += `Top rule: ${events[0].rule_name}\n`;
    msg += `Top source IP: ${events[0].src_ip}\n\n`;

    const mitre_seen = events.filter(e => e.mitre_technique).map(e => e.mitre_technique);
    if (mitre_seen.length > 0) {
      msg += `MITRE ATT&CK seen today: ${mitre_seen.join(', ')}\n\n`;
    }

    msg += `Action items:\n- Review ${events[0].rule_name}\n`;

    // Routing
    console.log(`-> Sending to ${source.send_channel.toUpperCase()} (${source.send_to}):\n`);
    console.log(msg);
    console.log("------------------------");

    // Upsert Run
    const existingRunIndex = sitrep_runs.findIndex(r => r.run_date === today && r.source_id === source.source_id);
    if (existingRunIndex > -1) {
        sitrep_runs[existingRunIndex].status = 'success';
        sitrep_runs[existingRunIndex].event_count = events.length;
        console.log(`[Run Log] UPDATED sitrep_runs for ${source.source_id}`);
    } else {
        sitrep_runs.push({ run_date: today, source_id: source.source_id, status: 'success', event_count: events.length });
        console.log(`[Run Log] INSERTED sitrep_runs for ${source.source_id}`);
    }
});

console.log("\n=== RUNNING DAILY DIGEST AGAIN (RE-RUN CHECK) ===");
source_registry.forEach(source => {
    const events = security_events.filter(e => e.source_id === source.source_id);
    if (events.length === 0) return;
    const today = new Date().toISOString().split('T')[0];

    // NOTE: The current implementation sends the message *every* time it runs.
    console.log(`-> Sending to ${source.send_channel.toUpperCase()} (${source.send_to}) again...`);

    const existingRunIndex = sitrep_runs.findIndex(r => r.run_date === today && r.source_id === source.source_id);
    if (existingRunIndex > -1) {
        console.log(`[Run Log] UPSERTED (Updated) sitrep_runs for ${source.source_id} to reflect re-run.`);
    }
});
