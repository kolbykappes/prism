import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";
import {
  MEETING_TRANSCRIPT_PROMPT,
  GENERAL_CONTENT_PROMPT,
  KB_COMPRESSION_PROMPT,
} from "@/lib/llm/prompt-template";

const SYSTEM_PROMPTS = [
  { slug: "meeting_transcript", name: "Meeting Transcript Summary", content: MEETING_TRANSCRIPT_PROMPT, isDefault: false },
  { slug: "general_content",    name: "General Content Summary",    content: GENERAL_CONTENT_PROMPT,    isDefault: true  },
  { slug: "kb_compression",     name: "Knowledge Base Compression", content: KB_COMPRESSION_PROMPT,     isDefault: false },
];

async function ensureSystemPrompts() {
  const count = await prisma.promptTemplate.count({ where: { slug: { not: null } } });
  if (count >= 3) return;

  for (const p of SYSTEM_PROMPTS) {
    const exists = await prisma.promptTemplate.findFirst({ where: { slug: p.slug } });
    if (!exists) {
      await prisma.promptTemplate.create({ data: p });
      logger.info("templates.system-prompt-created", { slug: p.slug });
    }
  }
}

export async function GET() {
  try {
    await ensureSystemPrompts();
    const templates = await prisma.promptTemplate.findMany({
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
    return jsonResponse(templates);
  } catch (error) {
    logger.error("templates.fetch.failed", { error });
    return errorResponse("Failed to fetch prompt templates", 500, error instanceof Error ? error.message : "Unknown error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, content, isDefault } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return errorResponse("Template name is required");
    }
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return errorResponse("Template content is required");
    }

    // If setting as default, unset current default (updateMany not supported in Neon HTTP mode)
    if (isDefault) {
      const currentDefault = await prisma.promptTemplate.findFirst({
        where: { isDefault: true },
      });
      if (currentDefault) {
        await prisma.promptTemplate.update({
          where: { id: currentDefault.id },
          data: { isDefault: false },
        });
      }
    }

    const template = await prisma.promptTemplate.create({
      data: {
        name: name.trim(),
        content: content.trim(),
        isDefault: isDefault ?? false,
      },
    });

    return jsonResponse(template, 201);
  } catch (error) {
    logger.error("templates.create.failed", { error });
    return errorResponse("Failed to create prompt template", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
