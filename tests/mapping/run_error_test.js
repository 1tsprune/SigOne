const workflow = { name: "sigone-daily-digest", id: "wf-1234" };
const exec = {
    id: "exec-9999",
    error: {
        message: "API key is invalid",
        node: { name: "Summarize (LLM)" }
    }
};

let msg = `🚨 *SigOne Workflow Error*\n\n`;
msg += `*Workflow:* ${workflow.name} (ID: ${workflow.id})\n`;
msg += `*Execution ID:* ${exec.id}\n`;
if (exec.error) {
  msg += `*Error message:* ${exec.error.message}\n`;
  if (exec.error.node && exec.error.node.name) {
    msg += `*Failed node:* ${exec.error.node.name}\n`;
  }
}
msg += `\nPlease check the n8n execution logs for more details.`;

console.log("=== TELEGRAM ERROR NOTIFICATION OUTPUT ===");
console.log(msg);