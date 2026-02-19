import { NextRequest, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { compressKb } from "@/lib/compress-kb";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return errorResponse("Project not found", 404);
    }

    const body = await request.json();
    const targetTokens = Number(body.targetTokens);
    if (!targetTokens || targetTokens < 100 || targetTokens > 50000) {
      return errorResponse("targetTokens must be between 100 and 50000");
    }

    const completeSummaryCount = await prisma.markdownSummary.count({
      where: { projectId: id, processingStatus: "complete" },
    });
    if (completeSummaryCount === 0) {
      return errorResponse("No completed summaries to compress", 400);
    }

    logger.info("compress-kb.queued", { projectId: id, targetTokens });

    after(() => compressKb(id, targetTokens));

    return jsonResponse({ status: "compressing" }, 202);
  } catch (error) {
    logger.error("compress-kb.route.failed", { error });
    return errorResponse("Failed to start compression", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
