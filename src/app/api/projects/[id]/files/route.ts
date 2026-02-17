import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { uploadBlob } from "@/lib/blob";
import { validateFileType, validateFileSize, extensionToFileType } from "@/lib/validation";
import { FileType } from "@/generated/prisma";
import { inngest } from "@/inngest/client";
import { logActivity } from "@/lib/activity";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Allow large file uploads
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const files = await prisma.sourceFile.findMany({
      where: { projectId: id },
      orderBy: { uploadedAt: "desc" },
    });

    return jsonResponse(files);
  } catch (error) {
    logger.error("files.fetch.failed", { error });
    return errorResponse("Failed to fetch files", 500, error instanceof Error ? error.message : "Unknown error");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return errorResponse("Project not found", 404);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file provided");
    }

    // Validate file type
    const ext = validateFileType(file.name);
    if (!ext) {
      return errorResponse(
        "Unsupported file type. Allowed: .txt, .vtt, .srt, .pdf, .md"
      );
    }

    // Validate file size
    if (!validateFileSize(file.size)) {
      return errorResponse("File size must be between 0 and 50MB");
    }

    // Upload to blob storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const blobPath = `projects/${id}/${Date.now()}-${file.name}`;
    const blobUrl = await uploadBlob(blobPath, buffer, file.type);

    // Create records sequentially (Neon HTTP adapter does not support transactions)
    const fileType = extensionToFileType(ext) as FileType;

    const sourceFile = await prisma.sourceFile.create({
      data: {
        projectId: id,
        filename: file.name,
        fileType,
        fileSize: file.size,
        blobUrl,
      },
    });

    await prisma.markdownSummary.create({
      data: {
        sourceFileId: sourceFile.id,
        projectId: id,
        processingStatus: "queued",
      },
    });

    await prisma.processingJob.create({
      data: {
        sourceFileId: sourceFile.id,
        status: "queued",
      },
    });

    await prisma.project.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // Fire Inngest event for background processing (non-fatal)
    try {
      await inngest.send({
        name: "file/uploaded",
        data: { sourceFileId: sourceFile.id },
      });
    } catch (error) {
      logger.warn("inngest.send.failed", { sourceFileId: sourceFile.id, error });
    }

    logActivity({
      projectId: id,
      action: "uploaded",
      sourceFileId: sourceFile.id,
      metadata: { filename: file.name },
    });

    return jsonResponse(sourceFile, 201);
  } catch (error) {
    logger.error("files.upload.failed", { error });
    return errorResponse("Failed to upload file", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
