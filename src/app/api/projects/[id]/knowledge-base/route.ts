import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return errorResponse("Project not found", 404);
  }

  const summaries = await prisma.markdownSummary.findMany({
    where: {
      projectId: id,
      processingStatus: "complete",
      content: { not: null },
    },
    orderBy: { generatedAt: "asc" },
    include: {
      sourceFile: { select: { filename: true } },
    },
  });

  const compiled = summaries
    .map((s) => `# ${s.sourceFile.filename}\n\n${s.content}`)
    .join("\n\n---\n\n");

  return jsonResponse({
    projectId: id,
    projectName: project.name,
    summaryCount: summaries.length,
    markdown: compiled,
  });
}
