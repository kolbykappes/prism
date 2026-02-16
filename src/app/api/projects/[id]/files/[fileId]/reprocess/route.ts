import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { inngest } from "@/inngest/client";
import { logActivity } from "@/lib/activity";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
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

  // Fire Inngest event
  await inngest.send({
    name: "file/uploaded",
    data: { sourceFileId: fileId },
  });

  logActivity({
    projectId: id,
    action: "reprocessed",
    sourceFileId: fileId,
    metadata: { filename: file.filename },
  });

  return jsonResponse({ success: true });
}
