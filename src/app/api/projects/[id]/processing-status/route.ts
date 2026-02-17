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

    // Get all processing jobs with their source files and summaries
    const jobs = await prisma.processingJob.findMany({
      where: {
        sourceFile: { projectId: id },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Fetch source files and summaries separately (no include to avoid implicit transactions)
    const sourceFileIds = jobs.map((j) => j.sourceFileId);

    const [sourceFiles, summaries] = await Promise.all([
      prisma.sourceFile.findMany({
        where: { id: { in: sourceFileIds } },
        select: { id: true, filename: true, fileType: true, fileSize: true },
      }),
      prisma.markdownSummary.findMany({
        where: { sourceFileId: { in: sourceFileIds } },
        select: {
          sourceFileId: true,
          processingStatus: true,
          errorMessage: true,
          llmModel: true,
          tokenCount: true,
          truncated: true,
        },
      }),
    ]);

    const fileMap = new Map(sourceFiles.map((f) => [f.id, f]));
    const summaryMap = new Map(summaries.map((s) => [s.sourceFileId, s]));

    const enriched = jobs.map((job) => {
      const file = fileMap.get(job.sourceFileId);
      const summary = summaryMap.get(job.sourceFileId);
      return {
        id: job.id,
        sourceFileId: job.sourceFileId,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString() ?? null,
        completedAt: job.completedAt?.toISOString() ?? null,
        errorMessage: job.errorMessage,
        filename: file?.filename ?? null,
        fileType: file?.fileType ?? null,
        fileSize: file?.fileSize ?? null,
        summaryStatus: summary?.processingStatus ?? null,
        summaryError: summary?.errorMessage ?? null,
        llmModel: summary?.llmModel ?? null,
        tokenCount: summary?.tokenCount ?? null,
        truncated: summary?.truncated ?? null,
      };
    });

    return jsonResponse(enriched);
  } catch (error) {
    logger.error("processing-status.fetch.failed", { error });
    return errorResponse(
      "Failed to fetch processing status",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
