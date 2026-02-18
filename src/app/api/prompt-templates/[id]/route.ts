import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await prisma.promptTemplate.findUnique({ where: { id } });
    if (!template) {
      return errorResponse("Template not found", 404);
    }

    return jsonResponse(template);
  } catch (error) {
    logger.error("template.fetch.failed", { error });
    return errorResponse("Failed to fetch prompt template", 500, error instanceof Error ? error.message : "Unknown error");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, content, isDefault } = body;

    const existing = await prisma.promptTemplate.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Template not found", 404);
    }

    // If setting as default, unset current default (updateMany not supported in Neon HTTP mode)
    if (isDefault && !existing.isDefault) {
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

    const updated = await prisma.promptTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(content !== undefined && { content: content.trim() }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return jsonResponse(updated);
  } catch (error) {
    logger.error("template.update.failed", { error });
    return errorResponse("Failed to update prompt template", 500, error instanceof Error ? error.message : "Unknown error");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await prisma.promptTemplate.findUnique({ where: { id } });
    if (!template) {
      return errorResponse("Template not found", 404);
    }

    if (template.isDefault) {
      return errorResponse("Cannot delete the default prompt template", 400);
    }

    await prisma.promptTemplate.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch (error) {
    logger.error("template.delete.failed", { error });
    return errorResponse("Failed to delete prompt template", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
