import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";
import { logger } from "@/lib/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const projectPeople = await prisma.projectPerson.findMany({
      where: { projectId: id },
      orderBy: { addedAt: "desc" },
      include: { person: true },
    });

    return jsonResponse(projectPeople);
  } catch (error) {
    logger.error("people.fetch.failed", { error });
    return errorResponse("Failed to fetch people", 500, error instanceof Error ? error.message : "Unknown error");
  }
}

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
    const { name, email, organization, role, notes } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return errorResponse("Name is required");
    }

    // Find or create the person
    let person = email
      ? await prisma.person.findFirst({ where: { email } })
      : null;

    if (!person) {
      person = await prisma.person.create({
        data: {
          name: name.trim(),
          email: email || null,
          organization: organization || null,
          role: role || null,
          notes: notes || null,
        },
      });
    }

    // Check if already linked
    const existing = await prisma.projectPerson.findUnique({
      where: { projectId_personId: { projectId: id, personId: person.id } },
    });

    if (existing) {
      return errorResponse("This person is already in the project");
    }

    const projectPerson = await prisma.projectPerson.create({
      data: {
        projectId: id,
        personId: person.id,
        role: role || null,
        notes: notes || null,
        autoExtracted: false,
      },
      include: { person: true },
    });

    logActivity({
      projectId: id,
      action: "person_added",
      metadata: { personName: person.name },
    });

    return jsonResponse(projectPerson, 201);
  } catch (error) {
    logger.error("people.add.failed", { error });
    return errorResponse("Failed to add person", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
