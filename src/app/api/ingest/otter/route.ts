import { NextRequest, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { uploadBlob } from "@/lib/blob";
import { processFile } from "@/lib/process-file";
import { logActivity } from "@/lib/activity";
import { upsertPersonInProject } from "@/lib/people-extraction";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    // Auth: Bearer token required for external callers (Zapier).
    // Requests from the app UI include an X-Source: app header and skip auth.
    const isAppRequest = request.headers.get("x-source") === "app";
    if (!isAppRequest) {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");
      if (!process.env.INGEST_SECRET || token !== process.env.INGEST_SECRET) {
        return errorResponse("Unauthorized", 401);
      }
    }

    const body = await request.json();
    const { projectId, transcript, title, speakers, meetingDate } = body;

    if (!projectId || typeof projectId !== "string") {
      return errorResponse("projectId is required");
    }
    if (!transcript || typeof transcript !== "string") {
      return errorResponse("transcript is required");
    }
    if (!title || typeof title !== "string") {
      return errorResponse("title is required");
    }

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return errorResponse("Project not found", 404);
    }

    // Auto-extract speakers as people
    if (Array.isArray(speakers) && speakers.length > 0) {
      for (const speakerName of speakers) {
        if (typeof speakerName === "string" && speakerName.trim()) {
          await upsertPersonInProject({
            projectId,
            name: speakerName.trim(),
            role: "Meeting participant",
            autoExtracted: true,
          });
        }
      }
    }

    // Build file content with metadata header
    const contentParts = [
      `Title: ${title}`,
      meetingDate ? `Date: ${meetingDate}` : null,
      Array.isArray(speakers) && speakers.length > 0
        ? `Speakers: ${speakers.join(", ")}`
        : null,
      "",
      transcript,
    ].filter((line) => line !== null);

    const content = contentParts.join("\n");
    const safeTitle = title.slice(0, 50).replace(/[^a-zA-Z0-9 ]/g, "_");
    const filename = `${safeTitle}_${Date.now()}.txt`;
    const buffer = Buffer.from(content, "utf-8");
    const blobUrl = await uploadBlob(
      `projects/${projectId}/${filename}`,
      buffer,
      "text/plain"
    );

    // Create records sequentially (Neon HTTP adapter does not support transactions)
    const sourceFile = await prisma.sourceFile.create({
      data: {
        projectId,
        filename,
        fileType: "txt",
        fileSize: buffer.length,
        blobUrl,
        uploadedBy: "Otter.ai",
        ingestSource: "otter",
      },
    });

    await prisma.markdownSummary.create({
      data: {
        sourceFileId: sourceFile.id,
        projectId,
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
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    after(() => processFile(sourceFile.id));

    logActivity({
      projectId,
      action: "otter_ingested",
      sourceFileId: sourceFile.id,
      metadata: { title },
    });

    logger.info("otter.ingested", { projectId, sourceFileId: sourceFile.id, title });

    return jsonResponse({ success: true, sourceFileId: sourceFile.id }, 201);
  } catch (error) {
    logger.error("otter.ingest.failed", { error });
    return errorResponse("Failed to ingest transcript", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
