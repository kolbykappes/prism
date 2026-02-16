import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return errorResponse("Project not found", 404);
    }

    const logs = await prisma.activityLog.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return jsonResponse(logs);
  } catch (error) {
    console.error("Failed to fetch activity logs:", error);
    return errorResponse("Failed to fetch activity logs", 500);
  }
}
