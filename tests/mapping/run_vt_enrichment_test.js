/**
 * SigOne v1.1 — VirusTotal Enrichment Logic Test
 *
 * Tests the Extract Top IPs logic and cache-check flow
 * using fixture data, without calling the real VT API.
 */

const fs = require('fs');
const path = require('path');

console.log("=== SigOne VT Enrichment Tests ===\n");

// ---------- Test 1: Extract Top IPs logic ----------
console.log("--- Test 1: Extract Top External IPs from events ---");

// Simulate a batch of normalized security_events rows
const mockEvents = [
    { src_ip: '203.0.113.50', dst_ip: '10.0.0.5',     severity: 'high' },
    { src_ip: '203.0.113.50', dst_ip: '192.168.1.10',  severity: 'critical' },
    { src_ip: '198.51.100.7', dst_ip: '172.16.0.1',    severity: 'medium' },
    { src_ip: '192.168.1.1',  dst_ip: '10.0.0.5',      severity: 'low' },
    { src_ip: '198.51.100.7', dst_ip: '203.0.113.50',   severity: 'high' },
    { src_ip: null,           dst_ip: '127.0.0.1',      severity: 'info' },
    { src_ip: '45.33.32.156', dst_ip: null,             severity: 'medium' },
];

// Replicate the Extract Top IPs logic from the workflow
const isInternal = (ip) => {
    if (!ip) return true;
    return ip.startsWith('10.') || ip.startsWith('192.168.') ||
           ip.startsWith('172.16.') || ip.startsWith('172.17.') ||
           ip.startsWith('172.18.') || ip.startsWith('172.19.') ||
           ip.startsWith('172.20.') || ip.startsWith('172.21.') ||
           ip.startsWith('172.22.') || ip.startsWith('172.23.') ||
           ip.startsWith('172.24.') || ip.startsWith('172.25.') ||
           ip.startsWith('172.26.') || ip.startsWith('172.27.') ||
           ip.startsWith('172.28.') || ip.startsWith('172.29.') ||
           ip.startsWith('172.30.') || ip.startsWith('172.31.') ||
           ip === '127.0.0.1' || ip === '::1';
};

const ipCounts = {};
mockEvents.forEach(e => {
    [e.src_ip, e.dst_ip].forEach(ip => {
        if (ip && !isInternal(ip)) {
            ipCounts[ip] = (ipCounts[ip] || 0) + 1;
        }
    });
});

const topIPs = Object.entries(ipCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([ip, count]) => ({ ip, count }));

console.log("All external IPs found:", JSON.stringify(ipCounts, null, 2));
console.log("Top 3 IPs selected:", JSON.stringify(topIPs, null, 2));

// Assertions
const passed1 = topIPs.length === 3;
const passed2 = topIPs[0].ip === '203.0.113.50' && topIPs[0].count === 3;
const passed3 = topIPs[1].ip === '198.51.100.7' && topIPs[1].count === 2;
const passed4 = !topIPs.some(t => isInternal(t.ip));

console.log(`  [${passed1 ? 'PASS' : 'FAIL'}] Extracted exactly 3 top IPs`);
console.log(`  [${passed2 ? 'PASS' : 'FAIL'}] Top IP is 203.0.113.50 (count=3)`);
console.log(`  [${passed3 ? 'PASS' : 'FAIL'}] Second IP is 198.51.100.7 (count=2)`);
console.log(`  [${passed4 ? 'PASS' : 'FAIL'}] No internal IPs in top list`);

// ---------- Test 2: Internal-only events produce null IP ----------
console.log("\n--- Test 2: All-internal events produce null fallback ---");

const internalOnlyEvents = [
    { src_ip: '192.168.1.1', dst_ip: '10.0.0.5',   severity: 'low' },
    { src_ip: '172.16.0.1',  dst_ip: '127.0.0.1',   severity: 'info' },
];

const ipCounts2 = {};
internalOnlyEvents.forEach(e => {
    [e.src_ip, e.dst_ip].forEach(ip => {
        if (ip && !isInternal(ip)) {
            ipCounts2[ip] = (ipCounts2[ip] || 0) + 1;
        }
    });
});

const topIPs2 = Object.entries(ipCounts2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([ip, count]) => ({ ip, count }));

const fallbackResult = topIPs2.length > 0
    ? topIPs2.map(item => ({ json: item }))
    : [{ json: { ip: null, count: 0 } }];

const passed5 = fallbackResult.length === 1 && fallbackResult[0].json.ip === null;
console.log("Result:", JSON.stringify(fallbackResult, null, 2));
console.log(`  [${passed5 ? 'PASS' : 'FAIL'}] Fallback to {ip: null} when no external IPs`);

// ---------- Test 3: Cache hit simulation ----------
console.log("\n--- Test 3: Cache hit skips API call ---");

const mockCache = [
    { indicator: '203.0.113.50', vt_malicious: 12, vt_total: 90, vt_link: 'https://www.virustotal.com/gui/ip-address/203.0.113.50', last_checked_at: new Date().toISOString() },
];

const ipToCheck = '203.0.113.50';
const cacheResult = mockCache.filter(c => c.indicator === ipToCheck);
const isCacheHit = cacheResult.length >= 1;

console.log(`  Looking up ${ipToCheck} in cache...`);
console.log(`  Cache result:`, JSON.stringify(cacheResult, null, 2));
console.log(`  [${isCacheHit ? 'PASS' : 'FAIL'}] Cache hit detected — API call would be skipped`);

// ---------- Test 4: Cache miss simulation ----------
console.log("\n--- Test 4: Cache miss triggers API path ---");

const ipToCheck2 = '45.33.32.156';
const cacheResult2 = mockCache.filter(c => c.indicator === ipToCheck2);
const isCacheMiss = cacheResult2.length === 0;

console.log(`  Looking up ${ipToCheck2} in cache...`);
console.log(`  Cache result: []`);
console.log(`  [${isCacheMiss ? 'PASS' : 'FAIL'}] Cache miss detected — API call would be triggered`);

// ---------- Test 5: VT result rendering in digest message ----------
console.log("\n--- Test 5: VT results render correctly in digest ---");

const vtResults = [
    { indicator: '203.0.113.50', vt_malicious: 12, vt_total: 90, vt_link: 'https://www.virustotal.com/gui/ip-address/203.0.113.50' },
    { indicator: '198.51.100.7', vt_malicious: 0,  vt_total: 88, vt_link: 'https://www.virustotal.com/gui/ip-address/198.51.100.7' },
    { indicator: '45.33.32.156', vt_malicious: 2,  vt_total: 91, vt_link: 'https://www.virustotal.com/gui/ip-address/45.33.32.156' },
];

let vtSection = '';
if (vtResults.length > 0) {
    vtSection += '🔍 *Threat Intel (VirusTotal):*\n';
    vtResults.forEach(r => {
        const ratio = `${r.vt_malicious}/${r.vt_total}`;
        const flag = r.vt_malicious > 5 ? '🔴' : r.vt_malicious > 0 ? '🟡' : '✅';
        vtSection += `${flag} ${r.indicator}: ${ratio} vendors flagged malicious\n`;
    });
}

console.log("Rendered VT section:\n");
console.log(vtSection);

const passed6 = vtSection.includes('🔴 203.0.113.50: 12/90');
const passed7 = vtSection.includes('✅ 198.51.100.7: 0/88');
const passed8 = vtSection.includes('🟡 45.33.32.156: 2/91');

console.log(`  [${passed6 ? 'PASS' : 'FAIL'}] High-threat IP renders with 🔴`);
console.log(`  [${passed7 ? 'PASS' : 'FAIL'}] Clean IP renders with ✅`);
console.log(`  [${passed8 ? 'PASS' : 'FAIL'}] Low-threat IP renders with 🟡`);

// ---------- Summary ----------
const allPassed = [passed1, passed2, passed3, passed4, passed5, isCacheHit, isCacheMiss, passed6, passed7, passed8];
const passCount = allPassed.filter(Boolean).length;
console.log(`\n=== Results: ${passCount}/${allPassed.length} passed ===`);
process.exit(passCount === allPassed.length ? 0 : 1);
