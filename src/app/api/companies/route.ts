import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { name: "asc" },
      include: {
        businessUnits: { orderBy: { name: "asc" } },
        _count: { select: { projects: true } },
      },
    });
    return jsonResponse(companies);
  } catch (error) {
    logger.error("companies.fetch.failed", { error });
    return errorResponse("Failed to fetch companies", 500, error instanceof Error ? error.message : "Unknown error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, markdownContent } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return errorResponse("Company name is required");
    }

    const company = await prisma.company.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        markdownContent: markdownContent?.trim() || null,
      },
    });

    return jsonResponse(company, 201);
  } catch (error) {
    logger.error("companies.create.failed", { error });
    return errorResponse("Failed to create company", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
