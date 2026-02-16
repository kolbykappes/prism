import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { uploadBlob } from "@/lib/blob";
import { inngest } from "@/inngest/client";
import { logActivity } from "@/lib/activity";
import { upsertPersonInProject } from "@/lib/people-extraction";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Auth: Bearer token
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!process.env.INGEST_SECRET || token !== process.env.INGEST_SECRET) {
      return errorResponse("Unauthorized", 401);
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

    // Create records in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const sourceFile = await tx.sourceFile.create({
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

      await tx.markdownSummary.create({
        data: {
          sourceFileId: sourceFile.id,
          projectId,
          processingStatus: "queued",
        },
      });

      await tx.processingJob.create({
        data: {
          sourceFileId: sourceFile.id,
          status: "queued",
        },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { updatedAt: new Date() },
      });

      return sourceFile;
    });

    // Fire Inngest event
    try {
      await inngest.send({
        name: "file/uploaded",
        data: { sourceFileId: result.id },
      });
    } catch (error) {
      console.error("Failed to send Inngest event:", error);
    }

    logActivity({
      projectId,
      action: "otter_ingested",
      sourceFileId: result.id,
      metadata: { title },
    });

    return jsonResponse({ success: true, sourceFileId: result.id }, 201);
  } catch (error) {
    console.error("Failed to ingest Otter transcript:", error);
    return errorResponse("Failed to ingest transcript", 500);
  }
}
