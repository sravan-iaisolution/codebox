// src/inngest/functions.ts
import { inngest } from "./client";
import OpenAI from "openai";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox, createSandboxAndGetId } from "./utils";
import { PROMPT } from "@/prompt/prompt";

import type {
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  ChatCompletion,
} from "openai/resources/chat/completions";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });



/** Run a command in the sandbox, capturing stdout/stderr robustly. */
async function runTerminal(sandbox: Sandbox, command: string) {
  let stdout = "";
  let stderr = "";
const buffers = { stdout: "", stderr: "" };

const result = await sandbox.commands.run(command, {
  onStdout: (data: string) => { buffers.stdout += data; },
  onStderr: (data: string) => { buffers.stderr += data; },
});


  return {
    exitCode: result.exitCode,
    stdout: stdout || result.stdout || "",
    stderr: stderr || result.stderr || "",
  };
}

/** Extract inner text of <tag>...</tag> (case-insensitive). */
function extractTag(text: string | null | undefined, tag: string): string | undefined {
  if (!text) return;
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
  const m = re.exec(text);
  return m?.[1]?.trim();
}

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },                   // keep same id if you want to replace the original
  { event: "test/hello.world" },
  async ({ event, step }) => {
    // --- Create or reuse a sandbox (compatible with your existing utils) ---
    const sandboxId = await step.run("ensure-sandbox", async () => {
      // prefer your own create helper so you can control region/image/etc.
      return await createSandboxAndGetId();
    });
    const sandbox = await getSandbox(sandboxId);

    // --- Define JSON-Schema tools (OpenAI "function calling") ---
    const tools: ChatCompletionCreateParams["tools"] = [
      {
        type: "function",
        function: {
          name: "terminal",
          description: "Run a shell command inside the E2B sandbox and return stdout, stderr, and exitCode.",
          parameters: {
            type: "object",
            properties: {
              command: { type: "string", description: "Command to run, e.g. `node -v`" },
            },
            required: ["command"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "createOrUpdateFiles",
          description: "Create or update files in the sandbox. Each file has a path and UTF-8 content.",
          parameters: {
            type: "object",
            properties: {
              files: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  properties: {
                    path: { type: "string", description: "Absolute or relative path inside sandbox" },
                    content: { type: "string", description: "File contents (UTF-8)" },
                  },
                  required: ["path", "content"],
                  additionalProperties: false,
                },
              },
            },
            required: ["files"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "readFiles",
          description: "Read one or more files from the sandbox and return their contents.",
          parameters: {
            type: "object",
            properties: {
              files: {
                type: "array",
                minItems: 1,
                description: "Paths of files to read (absolute or relative).",
                items: { type: "string" },
              },
            },
            required: ["files"],
            additionalProperties: false,
          },
        },
      },
    ];

    // --- Messages: mirror the agent-kit (system prompt + user value as-is) ---
    const userValue = String(event.data?.value ?? "");
    let messages: ChatCompletionMessageParam[] = [
      { role: "system", content: PROMPT },
      { role: "user", content: userValue },
    ];

    // --- State you previously kept in `network.state.data` ---
    const filesState: Record<string, string> = {}; // mirrors result.state.data.files
    let taskSummary: string | undefined;           // mirrors result.state.data.summary

    // --- Tool loop (max 15, like your network maxIter) ---
    let last: ChatCompletion | undefined;
    for (let i = 0; i < 15; i++) {
      const res = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.1,
      });

      last = res;
      const msg = res.choices[0].message;

      // lifecycle-equivalent: capture <task_summary> when it appears
      const msgText =
        typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content)
          //@ts-ignore
          ? msg.content?.map((c: any) => c?.text ?? "").join("")
          : "";

      const summary = extractTag(msgText, "task_summary");
      if (summary) taskSummary = summary;

      messages.push(msg as ChatCompletionMessageParam);

      const calls = msg.tool_calls;
      if (!calls || calls.length === 0) {
        // no tool calls; if we already captured a summary, we can stop
        if (taskSummary) break;
        // otherwise allow one more assistant turn to produce final text
        if (i >= 1) break;
        continue;
      }

      for (const call of calls) {
        if (call.type !== "function") continue;

        const args = (() => {
          try {
            return JSON.parse(call.function.arguments || "{}");
          } catch {
            return {};
          }
        })();

        // --- terminal ---
        if (call.function.name === "terminal") {
          const command = typeof args.command === "string" ? args.command : "";
          const result = await step.run("terminal", async () => runTerminal(sandbox, command));
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result),
          } as ChatCompletionMessageParam);
        }

        // --- createOrUpdateFiles ---
        if (call.function.name === "createOrUpdateFiles") {
          const files = Array.isArray(args.files) ? args.files : [];
          const writeResult = await step.run("createOrUpdateFiles", async () => {
            const successes: string[] = [];
            const failures: { path: string; error: string }[] = [];
            for (const f of files) {
              const path = String(f?.path ?? "");
              const content = String(f?.content ?? "");
              if (!path) {
                failures.push({ path, error: "Missing path" });
                continue;
              }
              try {
                await sandbox.files.write(path, content);
                filesState[path] = content; // maintain network.state.data.files equivalent
                successes.push(path);
              } catch (e: any) {
                failures.push({ path, error: e?.message ?? String(e) });
              }
            }
            return { successes, failures };
          });

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(writeResult),
          } as ChatCompletionMessageParam);
        }

        // --- readFiles ---
        if (call.function.name === "readFiles") {
          const files: string[] = Array.isArray(args.files) ? args.files.map((p: any) => String(p)) : [];
          const readResult = await step.run("readFiles", async () => {
            const results = await Promise.all(
              files.map(async (path) => {
                try {
                  const content = await sandbox.files.read(path);
                  return { path, ok: true, content };
                } catch (err: any) {
                  return { path, ok: false, error: err?.message ?? String(err) };
                }
              })
            );
            return { results };
          });

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(readResult),
          } as ChatCompletionMessageParam);
        }
      }
    }

    // final assistant content (may be string or array; normalize to string)
    const output =
      (typeof last?.choices?.[0]?.message?.content === "string"
        ? (last?.choices?.[0]?.message?.content as string)
        : Array.isArray(last?.choices?.[0]?.message?.content)
        ? (last?.choices?.[0]?.message?.content as any[]).map((c) => c?.text ?? "").join("")
        : "") || "";

    const url = await step.run("get-sandbox-url", async () => {
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    return {
      url,
      title: "Fragment",
      files: filesState,     // parity with result.state.data.files
      summary: taskSummary,  // parity with result.state.data.summary
      output,                // optional: keep the assistant’s last content if you need it
    };
  }
);
