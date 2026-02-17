import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return errorResponse("Unauthorized", 401);
    }

    const logs = await prisma.llmUsageLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Fetch related source files and projects for display names
    const sourceFileIds = logs
      .map((l) => l.sourceFileId)
      .filter((id): id is string => id !== null);
    const projectIds = logs
      .map((l) => l.projectId)
      .filter((id): id is string => id !== null);

    const [sourceFiles, projects] = await Promise.all([
      sourceFileIds.length > 0
        ? prisma.sourceFile.findMany({
            where: { id: { in: sourceFileIds } },
            select: { id: true, filename: true },
          })
        : [],
      projectIds.length > 0
        ? prisma.project.findMany({
            where: { id: { in: projectIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const fileMap = new Map(sourceFiles.map((f) => [f.id, f.filename]));
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    const enriched = logs.map((log) => ({
      ...log,
      filename: log.sourceFileId ? fileMap.get(log.sourceFileId) ?? null : null,
      projectName: log.projectId ? projectMap.get(log.projectId) ?? null : null,
    }));

    return jsonResponse(enriched);
  } catch (error) {
    logger.error("admin.usage.fetch.failed", { error });
    return errorResponse(
      "Failed to fetch usage logs",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
