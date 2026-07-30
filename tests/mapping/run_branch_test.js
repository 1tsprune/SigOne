const fs = require('fs');

// Mock data representing what the n8n branch node would see
const sourceConfigs = [
  { source_id: 'wazuh-client-a', send_channel: 'telegram', send_to: '-1001234567' },
  { source_id: 'splunk-client-b', send_channel: 'whatsapp', send_to: '1234567890' },
  { source_id: 'sentinel-client-c', send_channel: 'slack', send_to: 'C01ABCD2' }
];

console.log("=== Branching Logic Mock Test ===\n");

sourceConfigs.forEach(source => {
  console.log(`Processing source: ${source.source_id}`);
  
  // This simulates the n8n Switch node branching on source.send_channel
  if (source.send_channel === 'telegram') {
    console.log(`  -> Branch: TELEGRAM (Native node)`);
    console.log(`     Sending to chat_id: ${source.send_to}`);
  } else if (source.send_channel === 'whatsapp') {
    console.log(`  -> Branch: WHATSAPP (go-wa stub)`);
    console.log(`     Sending to number: ${source.send_to}`);
  } else if (source.send_channel === 'slack') {
    console.log(`  -> Branch: SLACK (Stub)`);
    console.log(`     Sending to channel: ${source.send_to}`);
  } else {
    console.log(`  -> ERROR: Unknown channel ${source.send_channel}`);
  }
  console.log("---");
});
