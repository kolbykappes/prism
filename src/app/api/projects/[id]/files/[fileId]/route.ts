import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { deleteBlobs } from "@/lib/blob";
import { logActivity } from "@/lib/activity";

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
