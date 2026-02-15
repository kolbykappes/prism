import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          sourceFiles: true,
          markdownSummaries: true,
        },
      },
    },
  });

  return jsonResponse(projects);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return errorResponse("Project name is required");
  }

  const existing = await prisma.project.findUnique({
    where: { name: name.trim() },
  });

  if (existing) {
    return errorResponse("A project with this name already exists", 409);
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  return jsonResponse(project, 201);
}
