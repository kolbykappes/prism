// System data seed — upserts the 3 canonical prompt templates.
// Runs automatically via `prisma db seed` during the Vercel build.
// Safe to re-run: skips slugs that already exist, preserving any UI edits.

// dotenv must load BEFORE any module that reads env vars at import time.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeonHttp } from "@prisma/adapter-neon";
import {
  MEETING_TRANSCRIPT_PROMPT,
  GENERAL_CONTENT_PROMPT,
  KB_COMPRESSION_PROMPT,
} from "../src/lib/llm/prompt-template";

const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {});
const prisma = new PrismaClient({ adapter });

const SYSTEM_PROMPTS = [
  {
    slug: "meeting_transcript",
    name: "Meeting Transcript Summary",
    content: MEETING_TRANSCRIPT_PROMPT,
    isDefault: false,
  },
  {
    slug: "general_content",
    name: "General Content Summary",
    content: GENERAL_CONTENT_PROMPT,
    isDefault: true,
  },
  {
    slug: "kb_compression",
    name: "Knowledge Base Compression",
    content: KB_COMPRESSION_PROMPT,
    isDefault: false,
  },
];

async function main() {
  console.log("Seeding system prompt templates...");

  for (const prompt of SYSTEM_PROMPTS) {
    const existing = await prisma.promptTemplate.findFirst({
      where: { slug: prompt.slug },
    });

    if (existing) {
      console.log(`  Skipping "${prompt.name}" — already exists`);
    } else {
      await prisma.promptTemplate.create({ data: prompt });
      console.log(`  Created "${prompt.name}"`);
    }
  }

  console.log("System seed complete.");
}

main()
  .catch((e) => {
    console.error("System seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
