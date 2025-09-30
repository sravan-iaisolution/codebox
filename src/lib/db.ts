import { PrismaClient } from '@/generated/prisma'
// import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = global as unknown as { 
    prisma: PrismaClient
}

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

import OpenAI from "openai";

if (process.env.NODE_ENV === "development") {
  (async () => {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
      const models = await client.models.list();
      console.log("Accessible models:", models.data.map(m => m.id));
    } catch (err) {
      console.error("Error listing models:", err);
    }
  })();
}


