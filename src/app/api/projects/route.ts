import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            sourceFiles: true,
            markdownSummaries: true,
          },
        },
      },
    });

    return jsonResponse(projects);
  } catch (error) {
    logger.error("projects.fetch.failed", { error });
    return errorResponse("Failed to fetch projects", 500, error instanceof Error ? error.message : "Unknown error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return errorResponse("Project name is required");
    }

    const existing = await prisma.project.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return errorResponse("A project with this name already exists", 409);
    }

    const { projectType, companyId, businessUnitId } = body;

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        projectType: projectType === "EG_PURSUIT" ? "EG_PURSUIT" : "DELIVERY",
        companyId: companyId || null,
        businessUnitId: businessUnitId || null,
      },
    });

    logActivity({
      projectId: project.id,
      action: "project_created",
      metadata: { name: project.name },
    });

    return jsonResponse(project, 201);
  } catch (error) {
    logger.error("projects.create.failed", { error });
    return errorResponse("Failed to create project", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
