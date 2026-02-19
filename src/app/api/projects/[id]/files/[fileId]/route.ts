import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { deleteBlobs } from "@/lib/blob";
import { logActivity } from "@/lib/activity";
import { logger } from "@/lib/logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;
    const body = await request.json();
    const { contentDate } = body;

    if (!contentDate || typeof contentDate !== "string") {
      return errorResponse("contentDate (ISO string) is required");
    }

    const date = new Date(contentDate);
    if (isNaN(date.getTime())) {
      return errorResponse("contentDate is not a valid date");
    }

    const file = await prisma.sourceFile.findFirst({
      where: { id: fileId, projectId: id },
    });
    if (!file) {
      return errorResponse("File not found", 404);
    }

    const updated = await prisma.sourceFile.update({
      where: { id: fileId },
      data: { contentDate: date, contentDateSource: "manual" },
    });

    logger.info("file.content-date.updated", { fileId, contentDate: date });
    return jsonResponse(updated);
  } catch (error) {
    logger.error("file.content-date.update.failed", { error });
    return errorResponse("Failed to update content date", 500, error instanceof Error ? error.message : "Unknown error");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params;

  const file = await prisma.sourceFile.findFirst({
    where: { id: fileId, projectId: id },
    include: { markdownSummary: { select: { blobUrl: true } } },
  });

  if (!file) {
    return errorResponse("File not found", 404);
  }

  // Delete blobs
  const blobUrls = [file.blobUrl];
  if (file.markdownSummary?.blobUrl) {
    blobUrls.push(file.markdownSummary.blobUrl);
  }
  await deleteBlobs(blobUrls);

  // Cascade delete handled by schema
  await prisma.sourceFile.delete({ where: { id: fileId } });

  // Touch project updatedAt
  await prisma.project.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  logActivity({
    projectId: id,
    action: "deleted",
    sourceFileId: fileId,
    metadata: { filename: file.filename },
  });

  return jsonResponse({ success: true });
}
