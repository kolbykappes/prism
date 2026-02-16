import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { del } from "@vercel/blob";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          sourceFiles: true,
          markdownSummaries: true,
        },
      },
    },
  });

  if (!project) {
    return errorResponse("Project not found", 404);
  }

  return jsonResponse(project);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, description, overview } = body;

  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
    return errorResponse("Project name cannot be empty");
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return errorResponse("Project not found", 404);
  }

  if (name && name.trim() !== project.name) {
    const existing = await prisma.project.findUnique({
      where: { name: name.trim() },
    });
    if (existing) {
      return errorResponse("A project with this name already exists", 409);
    }
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(overview !== undefined && { overview: overview?.trim() || null }),
    },
  });

  return jsonResponse(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      sourceFiles: { select: { blobUrl: true } },
      markdownSummaries: { select: { blobUrl: true } },
    },
  });

  if (!project) {
    return errorResponse("Project not found", 404);
  }

  // Delete blobs
  const blobUrls = [
    ...project.sourceFiles.map((f) => f.blobUrl),
    ...project.markdownSummaries.map((s) => s.blobUrl).filter(Boolean) as string[],
  ];

  if (blobUrls.length > 0) {
    await del(blobUrls);
  }

  // Cascade delete handled by Prisma schema
  await prisma.project.delete({ where: { id } });

  return jsonResponse({ success: true });
}
