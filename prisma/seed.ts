// dotenv must load BEFORE any module that reads env vars at import time.
// ES imports are hoisted, so we use dynamic import() for those modules.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeonHttp } from "@prisma/adapter-neon";
import * as fs from "fs";
import * as path from "path";

const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {});
const prisma = new PrismaClient({ adapter });

const PROJECT_NAME = "Kolby Test";

const DEFAULT_PROMPT_CONTENT = `You are a professional knowledge curator. Transform the following source content into well-structured markdown notes suitable for use as reference material in an AI assistant's project knowledge base.

SOURCE FILE: {{filename}}
FILE TYPE: {{fileType}}

INSTRUCTIONS:
- Create clear, scannable markdown with appropriate headings
- For meeting transcripts: extract key discussion points, decisions, action items, and next steps
- For documents: summarize main themes, key data points, and conclusions
- For all content: preserve important specifics (names, dates, numbers, technical details)
- Use bullet points for lists of items
- Use blockquotes for important quotes or callouts
- Omit filler, tangents, and redundant content
- If the content includes participants/speakers, list them at the top
- Target output length: roughly 20-30% of source length (concise but comprehensive)

SOURCE CONTENT:
{{extractedText}}`;

const seedFiles = [
  { filename: "AI Platform Strategy Meeting_otter_ai.txt", fileType: "txt" as const },
  { filename: "Kirby Consignment Biz Planning_otter_ai.txt", fileType: "txt" as const },
  { filename: "Ragged Mountain Project Update_otter_ai.txt", fileType: "txt" as const },
  { filename: "DeleteRisk Website changes.pdf", fileType: "pdf" as const },
];

async function main() {
  // Dynamic imports so dotenv.config() has already run
  const { extractText } = await import("../src/lib/text-extraction");
  const { buildPrompt } = await import("../src/lib/llm/prompt-template");
  const { generateSummary } = await import("../src/lib/llm/claude");
  const { truncateText } = await import("../src/lib/llm/truncation");

  console.log("Seeding database...\n");

  // Seed default prompt template
  const existingDefault = await prisma.promptTemplate.findFirst({
    where: { isDefault: true },
  });
  if (!existingDefault) {
    await prisma.promptTemplate.create({
      data: {
        name: "Default Knowledge Curator",
        content: DEFAULT_PROMPT_CONTENT,
        isDefault: true,
      },
    });
    console.log("Created default prompt template\n");
  } else {
    console.log("Default prompt template already exists, skipping\n");
  }

  // Delete existing project (cascade deletes children)
  const existing = await prisma.project.findUnique({
    where: { name: PROJECT_NAME },
  });
  if (existing) {
    await prisma.project.delete({ where: { id: existing.id } });
    console.log(`Deleted existing "${PROJECT_NAME}" project`);
  }

  const project = await prisma.project.create({
    data: {
      name: PROJECT_NAME,
      description:
        "Pre-loaded test project with 4 processed documents for UI testing.",
    },
  });
  console.log(`Created project "${PROJECT_NAME}" (${project.id})\n`);

  // Log project creation
  await prisma.activityLog.create({
    data: {
      projectId: project.id,
      action: "project_created",
      userName: "Kolby",
      metadata: { name: project.name },
    },
  });

  for (const file of seedFiles) {
    const filePath = path.join(__dirname, "..", "test-docs", file.filename);
    const buffer = fs.readFileSync(filePath);
    const stat = fs.statSync(filePath);

    // 1. Extract text (same as the Inngest pipeline)
    console.log(`Processing ${file.filename}...`);
    const rawText = await extractText(buffer, file.fileType);
    const { text: extractedText, truncated } = truncateText(rawText);
    console.log(`  Extracted ${rawText.length} chars (truncated: ${truncated})`);

    // 2. Build prompt and call Claude (same prompt template as production)
    const prompt = buildPrompt(file.filename, file.fileType, extractedText);
    console.log(`  Calling Claude...`);
    const result = await generateSummary(prompt);

    let content = result.content;
    if (truncated) {
      content = `> **Note:** This document was truncated before processing.\n\n${content}`;
    }

    console.log(`  Got ${content.length} chars from ${result.model} (${result.inputTokens} input tokens)`);

    // 3. Create DB records
    const now = new Date();

    const sourceFile = await prisma.sourceFile.create({
      data: {
        projectId: project.id,
        filename: file.filename,
        fileType: file.fileType,
        fileSize: stat.size,
        blobUrl: `seed://${file.filename}`,
        uploadedBy: "Kolby",
      },
    });

    await prisma.markdownSummary.create({
      data: {
        sourceFileId: sourceFile.id,
        projectId: project.id,
        content,
        processingStatus: "complete",
        generatedAt: now,
        llmModel: result.model,
        tokenCount: result.inputTokens,
        truncated,
      },
    });

    await prisma.processingJob.create({
      data: {
        sourceFileId: sourceFile.id,
        status: "complete",
        createdAt: now,
        startedAt: now,
        completedAt: now,
      },
    });

    // Log file upload and summary completion
    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        action: "uploaded",
        sourceFileId: sourceFile.id,
        userName: "Kolby",
        metadata: { filename: file.filename },
      },
    });

    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        action: "summary_completed",
        sourceFileId: sourceFile.id,
        userName: "Kolby",
        metadata: { filename: file.filename },
      },
    });

    console.log(`  Done!\n`);
  }

  console.log("Seed complete! Created 4 source files with real LLM summaries.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
