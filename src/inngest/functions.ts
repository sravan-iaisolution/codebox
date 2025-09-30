// src/inngest/functions.ts — rewritten, hardened, and syntax-fixed
import { inngest } from "./client";
import OpenAI from "openai";
import type {
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from "openai/resources/chat/completions";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox, createSandboxAndGetId } from "./utils";
import { PROMPT } from "@/prompt/prompt";
import { prisma } from "@/lib/db";

// ---------- Config ----------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1";

const TEMPERATURE = process.env.OPENAI_TEMPERATURE
  ? Number(process.env.OPENAI_TEMPERATURE)
  : 0.1;

const MAX_TOKENS = process.env.OPENAI_MAX_TOKENS
  ? Number(process.env.OPENAI_MAX_TOKENS)
  : 1500;

const TOOL_BYTES_LIMIT = 64 * 1024; // 64KB safety cap for tool payloads

// Prisma connection resilience
const PRISMA_MAX_RETRIES = Number(process.env.PRISMA_MAX_RETRIES ?? 3);
const PRISMA_BACKOFF_MS = Number(process.env.PRISMA_BACKOFF_MS ?? 300);

// ---------- Utils ----------
/** Generic retry with exponential backoff & jitter */
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = PRISMA_MAX_RETRIES
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message ?? err);
      // Only retry on pool/connection issues
      const retriable = /connection pool|Timed out fetching a new connection|P1001|P1002|timeout/i.test(
        msg
      );
      if (!retriable || i === attempts - 1) throw err;
      const jitter = Math.floor(Math.random() * 100);
      const delay = PRISMA_BACKOFF_MS * Math.pow(2, i) + jitter;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  // should be unreachable
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  throw lastErr;
}

/** Run a command in the sandbox, capturing stdout/stderr robustly. */
async function runTerminal(sandbox: Sandbox, command: string) {
  const buffers = { stdout: "", stderr: "" };

  const result = await sandbox.commands.run(command, {
    onStdout: (data: string) => {
      buffers.stdout += data;
    },
    onStderr: (data: string) => {
      buffers.stderr += data;
    },
  });

  return {
    exitCode: result.exitCode,
    stdout: buffers.stdout || result.stdout || "",
    stderr: buffers.stderr || result.stderr || "",
  } as const;
}

/** Extract inner text of <tag> ... </tag> (lenient, case-insensitive). */
function extractTag(text?: string | null, tag?: string): string | undefined {
  if (!text || !tag) return;
  const re = new RegExp(
    `<\\s*${tag}\\s*>[\\s\\S]*?<\\s*/\\s*${tag}\\s*>`,
    "i"
  );
  const m = re.exec(text);
  if (!m) return;
  return m[0]
    .replace(new RegExp(`^<\\s*${tag}\\s*>|<\\s*/\\s*${tag}\\s*>$`, "gi"), "")
    .trim();
}

/** Truncate large strings to avoid ballooning the tool messages. */
function truncate(s: string | undefined | null, max = TOOL_BYTES_LIMIT) {
  if (!s) return "";
  if (s.length <= max) return String(s);
  return s.slice(0, max) + `\n...[truncated ${s.length - max} bytes]`;
}

/** Normalize Assistant message for continuation (keep tool_calls). */
function normalizeAssistantMessage(m: any): ChatCompletionMessageParam {
  let content = "";
  if (typeof m?.content === "string") content = m.content;
  else if (Array.isArray(m?.content))
    content = m.content.map((c: any) => c?.text ?? "").join("");

  // Keep tool_calls reference for function-calling continuity
  return {
    role: "assistant",
    content,
    tool_calls: (m?.tool_calls as ChatCompletionMessageToolCall[]) ?? undefined,
  };
}

// Very simple allowlist for shell commands; expand cautiously if needed.
const SAFE_CMD = [
  /^(node)(\s|$)/,
  /^(npm|pnpm|yarn)(\s|$)/,
  /^(bun)(\s|$)/,
  /^(python|py)(\s|$)/,
  /^(ls)(\s|$)/,
  /^(cat)(\s|$)/,
  /^(echo)(\s|$)/,
];
const isSafeCommand = (cmd: string) => SAFE_CMD.some((r) => r.test(cmd.trim()));

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {
    // ---- Validate event payload early ----
    const userValue = String(event.data?.value ?? "");
    const projectId = event.data?.projectId as string | undefined;
    if (!projectId) {
      throw new Error("Missing projectId in event payload");
    }

    // --- Create or reuse a sandbox (compatible with your existing utils) ---
    const sandboxId = await step.run("ensure-sandbox", async () => {
      // Prefer your own create helper so you can control region/image/etc.
      return await createSandboxAndGetId();
    });
    const sandbox = await getSandbox(sandboxId);

    // ---- Define JSON-Schema tools (OpenAI function calling) ----
    const tools: ChatCompletionCreateParams["tools"] = [
      {
        type: "function",
        function: {
          name: "terminal",
          description:
            "Run a shell command inside the E2B sandbox and return stdout, stderr, and exitCode.",
          parameters: {
            type: "object",
            properties: {
              command: {
                type: "string",
                description: "Command to run, e.g. `node -v`",
              },
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
          description:
            "Create or update files in the sandbox. Each file has a path and UTF-8 content.",
          parameters: {
            type: "object",
            properties: {
              files: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  properties: {
                    path: {
                      type: "string",
                      description:
                        "Absolute or relative path inside sandbox (e.g. `./app.ts`).",
                    },
                    content: {
                      type: "string",
                      description: "File contents (UTF-8)",
                    },
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

    // ---- Messages (system + user) ----
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: PROMPT },
      { role: "user", content: userValue },
    ];

    // ---- State akin to prior network state ----
    const filesState: Record<string, string> = {}; // accumulator visible to final return
    let taskSummary: string | undefined;

    // ---- Tool loop (max 15) ----
    let lastResponse: any | undefined;
    for (let i = 0; i < 15; i++) {
      const res = await step.run(`llm-turn-${i}`, async () =>
        openai.chat.completions.create({
          model: MODEL,
          messages,
          tools,
          tool_choice: "auto",
          temperature: TEMPERATURE,
          max_tokens: MAX_TOKENS,
        })
      );

      lastResponse = res;
      const choice = res.choices[0];
      const msg = choice.message as any;

      // capture <task_summary> when it appears
      const msgText =
        typeof msg?.content === "string"
          ? (msg.content as string)
          : Array.isArray(msg?.content)
          ? msg.content.map((c: any) => c?.text ?? "").join("")
          : "";
      const summary = extractTag(msgText, "task_summary");
      if (summary) taskSummary = summary;

      // push assistant message (keep tool_calls)
      messages.push(normalizeAssistantMessage(msg));

      const calls = msg?.tool_calls as Array<any> | undefined;
      const hasTools = Array.isArray(calls) && calls.length > 0;
      if (!hasTools) {
        // exit if model stopped or we already have a task summary
        if (taskSummary || choice.finish_reason === "stop") break;
        // otherwise allow a couple extra assistant turns at most
        if (i >= 2) break;
        continue;
      }

      // handle tool calls
      for (const call of calls) {
        if (call.type !== "function") continue;

        // parse args defensively
        const args = (() => {
          try {
            return JSON.parse(call.function.arguments || "{}");
          } catch {
            return {} as Record<string, unknown>;
          }
        })();

        // terminal
        if (call.function.name === "terminal") {
          const command =
            typeof (args as any).command === "string"
              ? (args as any).command.trim()
              : "";
          if (!command) {
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify({ error: "Missing 'command'" }),
            });
            continue;
          }

          if (!isSafeCommand(command)) {
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify({ error: "Command not allowed by policy" }),
            });
            continue;
          }

          const result = await step.run("terminal", async () =>
            runTerminal(sandbox, command)
          );
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({
              exitCode: result.exitCode,
              stdout: truncate(result.stdout),
              stderr: truncate(result.stderr),
            }),
          });
        }

        // createOrUpdateFiles
        if (call.function.name === "createOrUpdateFiles") {
          const files = Array.isArray((args as any).files)
            ? (args as any).files
            : [];

          const writeResult = await step.run("createOrUpdateFiles", async () => {
            const successes: string[] = [];
            const failures: { path: string; error: string }[] = [];
            const writtenFiles: Record<string, string> = {}; // <-- collect delta *inside* step

            for (const f of files as Array<{ path?: string; content?: string }>) {
              const path = String(f?.path ?? "").trim();
              const content = String(f?.content ?? "");
              console.log(path, content, "texts");
              if (!path) {
                failures.push({ path, error: "Missing path" });
                continue;
              }
              try {
                await sandbox.files.write(path, content);
                writtenFiles[path] = content; // <-- record delta here
                successes.push(path);
              } catch (e: unknown) {
                failures.push({
                  path,
                  error: (e as Error)?.message ?? String(e),
                });
              }
            }
            return {
              ok: failures.length === 0,
              successes,
              failures,
              writtenFiles, // <-- return the delta
            } as const;
          });

          // <-- merge the delta into the OUTER filesState (persists across steps)
          Object.assign(filesState, writeResult.writtenFiles);

          // Reply to the tool call without echoing contents (token-safe)
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({
              ok: writeResult.ok,
              successes: writeResult.successes,
              failures: writeResult.failures,
            }),
          });
        }

        // readFiles
        if (call.function.name === "readFiles") {
          const files: string[] = Array.isArray((args as any).files)
            ? (args as any).files.map((p: any) => String(p))
            : [];

          const readResult = await step.run("readFiles", async () => {
            const results = await Promise.all(
              files.map(async (path) => {
                try {
                  const content = await sandbox.files.read(path);
                  return { path, ok: true as const, content: truncate(content) };
                } catch (err: unknown) {
                  return {
                    path,
                    ok: false as const,
                    error: (err as Error)?.message ?? String(err),
                  };
                }
              })
            );
            return { results } as const;
          });

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(readResult),
          });
        }
      }
    }

    // ---- Normalize final assistant content ----
    const lastChoice = lastResponse?.choices?.[0];
    const finalMsg = lastChoice?.message;
    const output = (() => {
      if (!finalMsg) return "";
      if (typeof finalMsg.content === "string") return finalMsg.content as string;
      if (Array.isArray(finalMsg.content))
        return (finalMsg.content as any[]).map((c) => c?.text ?? "").join("");
      return "";
    })();

    const url = await step.run("get-sandbox-url", async () => {
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    // ---- Persist result (force non-null sandboxUrl to satisfy schema) ----
    const safeSandboxUrl = url ?? "";

    const saved = await step.run("save-result", async () => {
      return await withRetry(async () => {
        return await prisma.message.create({
          data: {
            projectId,
            content: output || "",
            role: "ASSISTANT",
            type: "RESULT",
            fragment: {
              create: {
                sandboxUrl: safeSandboxUrl,
                title: "Fragment",
                files: filesState, // <-- now correctly populated
              },
            },
          },
          include: { fragment: true },
        });
      });
    });

    return {
      id: saved.id,
      url: saved.fragment?.sandboxUrl ?? url,
      title: saved.fragment?.title ?? "Fragment",
      files: filesState,
      summary: taskSummary,
      output,
    } as const;
  }
);
