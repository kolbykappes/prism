import { NextRequest, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { processFile } from "@/lib/process-file";
import { logActivity } from "@/lib/activity";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;

    const file = await prisma.sourceFile.findFirst({
      where: { id: fileId, projectId: id },
    });

    if (!file) {
      return errorResponse("File not found", 404);
    }

    // Reset summary to queued
    await prisma.markdownSummary.update({
      where: { sourceFileId: fileId },
      data: {
        processingStatus: "queued",
        content: null,
        blobUrl: null,
        generatedAt: null,
        errorMessage: null,
        tokenCount: null,
        truncated: false,
      },
    });

    // Create new processing job
    await prisma.processingJob.create({
      data: {
        sourceFileId: fileId,
        status: "queued",
      },
    });

    logActivity({
      projectId: id,
      action: "reprocessed",
      sourceFileId: fileId,
      metadata: { filename: file.filename },
    });

    // Schedule background processing after response is sent
    after(() => processFile(fileId));

    return jsonResponse({ success: true });
  } catch (error) {
    logger.error("files.reprocess.failed", { error });
    return errorResponse("Failed to reprocess file", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
