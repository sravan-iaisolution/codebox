
import { AgentResult, TextMessage } from "@inngest/agent-kit";

// utils.ts
import { Sandbox } from "@e2b/code-interpreter";

export async function getSandbox(id: string) {
  // returns a proper Sandbox instance with .commands/.files/.getHost
  return await Sandbox.connect(id);
}


export async function createSandboxAndGetId() {
  // template can be your template NAME or ID
  const sb = await Sandbox.create("sravan-test-2");
  return sb.sandboxId;           // ← this is the sandbox ID
}


export function lastAssistantTextMessageContent(result: AgentResult): string {
  const lastAssistantTextMessageIndex = result.output.findLastIndex(
    (m) => m.role === "assistant",
  );

  const message = result.output[lastAssistantTextMessageIndex] as TextMessage | undefined;

  return message?.content
    ? (typeof message.content === "string"
        ? message.content
        : message.content.map((c) => c.text).join(""))
    : ""; // or `undefined`
}

