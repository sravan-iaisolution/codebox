// src/inngest/functions.ts
import { inngest } from "./client";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const helloWorld = inngest.createFunction(
  { id: "hello-world2" },
  { event: "test/hello.world" },
  async ({ event }) => {
    const text = String(event.data?.value ?? "");
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert next.js developer. You write readable, maintainable code. you write simple next.js & react.js snippets" },
        { role: "user", content: `Summarize the following text:\n\n${text}` },
      ],
      temperature: 0.2,
    });

    const output = res.choices?.[0]?.message?.content ?? "";
    return { output};
  }
);
