const sourceConfigs = [
    { source_id: 'wazuh-org-alpha', source_type: 'wazuh', client_label: 'Org Alpha', send_channel: 'telegram', send_to: '-111' },
    { source_id: 'wazuh-org-beta', source_type: 'wazuh', client_label: 'Org Beta', send_channel: 'slack', send_to: 'C222' }
];

console.log("=== Multi-Tenant Loop Mock Test ===\n");
console.log("Simulating SplitInBatches node iteration across active sources...\n");

sourceConfigs.forEach(source => {
    console.log(`[Batch Loop Iteration] Processing active source: ${source.source_id}`);
    
    // Simulate Get Today's Events SQL Query isolated by source_id
    console.log(`  -> SQL Execute: SELECT ... FROM security_events WHERE source_id = '${source.source_id}' AND received_at >= NOW() - 1 day`);
    
    // Simulate LLM Prompt Build Node
    const clientString = source.client_label ? ` (Client: ${source.client_label})` : '';
    const prompt = `Analyze the following security events for source ${source.source_id}${clientString}...`;
    console.log(`  -> Rendered Prompt Header: "${prompt.substring(0, 80)}..."`);
    
    // Simulate Final Message Render
    const clientStringRender = source.client_label ? ` | Client: ${source.client_label}` : '';
    console.log(`  -> Rendered Message Header: "📅 2026-07-30 | Source: ${source.source_id}${clientStringRender}"`);
    
    // Delivery Routing
    console.log(`  -> Routing to ${source.send_channel.toUpperCase()} destination ${source.send_to}`);
    console.log("---");
});
