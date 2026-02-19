import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    const businessUnits = await prisma.businessUnit.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { name: "asc" },
      include: { company: { select: { id: true, name: true } } },
    });
    return jsonResponse(businessUnits);
  } catch (error) {
    logger.error("business-units.fetch.failed", { error });
    return errorResponse("Failed to fetch business units", 500, error instanceof Error ? error.message : "Unknown error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, name, description, markdownContent } = body;

    if (!companyId || typeof companyId !== "string") {
      return errorResponse("companyId is required");
    }
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return errorResponse("Business unit name is required");
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return errorResponse("Company not found", 404);

    const businessUnit = await prisma.businessUnit.create({
      data: {
        companyId,
        name: name.trim(),
        description: description?.trim() || null,
        markdownContent: markdownContent?.trim() || null,
      },
    });

    return jsonResponse(businessUnit, 201);
  } catch (error) {
    logger.error("business-units.create.failed", { error });
    return errorResponse("Failed to create business unit", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
