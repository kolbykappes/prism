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
    const bu = await prisma.businessUnit.findUnique({
      where: { id },
      include: { company: { select: { id: true, name: true } } },
    });
    if (!bu) return errorResponse("Business unit not found", 404);
    return jsonResponse(bu);
  } catch (error) {
    logger.error("business-units.get.failed", { error });
    return errorResponse("Failed to fetch business unit", 500, error instanceof Error ? error.message : "Unknown error");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, markdownContent } = body;

    const existing = await prisma.businessUnit.findUnique({ where: { id } });
    if (!existing) return errorResponse("Business unit not found", 404);

    const updated = await prisma.businessUnit.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(markdownContent !== undefined && { markdownContent: markdownContent?.trim() || null }),
      },
    });

    return jsonResponse(updated);
  } catch (error) {
    logger.error("business-units.update.failed", { error });
    return errorResponse("Failed to update business unit", 500, error instanceof Error ? error.message : "Unknown error");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const bu = await prisma.businessUnit.findUnique({ where: { id } });
    if (!bu) return errorResponse("Business unit not found", 404);

    const linkedProject = await prisma.project.findFirst({ where: { businessUnitId: id } });
    if (linkedProject) {
      return errorResponse("Cannot delete a business unit that is linked to one or more projects. Remove it from those projects first.", 400);
    }

    await prisma.businessUnit.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (error) {
    logger.error("business-units.delete.failed", { error });
    return errorResponse("Failed to delete business unit", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
