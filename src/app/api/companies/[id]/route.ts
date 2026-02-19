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
    const company = await prisma.company.findUnique({
      where: { id },
      include: { businessUnits: { orderBy: { name: "asc" } } },
    });
    if (!company) return errorResponse("Company not found", 404);
    return jsonResponse(company);
  } catch (error) {
    logger.error("companies.get.failed", { error });
    return errorResponse("Failed to fetch company", 500, error instanceof Error ? error.message : "Unknown error");
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

    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) return errorResponse("Company not found", 404);

    const updated = await prisma.company.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(markdownContent !== undefined && { markdownContent: markdownContent?.trim() || null }),
      },
    });

    return jsonResponse(updated);
  } catch (error) {
    logger.error("companies.update.failed", { error });
    return errorResponse("Failed to update company", 500, error instanceof Error ? error.message : "Unknown error");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) return errorResponse("Company not found", 404);

    // Unlink any projects referencing this company before deleting
    const linkedProject = await prisma.project.findFirst({ where: { companyId: id } });
    if (linkedProject) {
      return errorResponse("Cannot delete a company that is linked to one or more projects. Remove the company from those projects first.", 400);
    }

    await prisma.company.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (error) {
    logger.error("companies.delete.failed", { error });
    return errorResponse("Failed to delete company", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
