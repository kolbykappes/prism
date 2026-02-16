import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; personId: string }> }
) {
  try {
    const { id, personId } = await params;

    const projectPerson = await prisma.projectPerson.findFirst({
      where: { projectId: id, personId },
      include: { person: true },
    });

    if (!projectPerson) {
      return errorResponse("Person not found in this project", 404);
    }

    const body = await request.json();
    const { name, email, organization, role, notes } = body;

    // Update the Person record
    await prisma.person.update({
      where: { id: personId },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(email !== undefined ? { email: email || null } : {}),
        ...(organization !== undefined ? { organization: organization || null } : {}),
      },
    });

    // Update the ProjectPerson record
    const updated = await prisma.projectPerson.update({
      where: { id: projectPerson.id },
      data: {
        ...(role !== undefined ? { role: role || null } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
      },
      include: { person: true },
    });

    return jsonResponse(updated);
  } catch (error) {
    console.error("Failed to update person:", error);
    return errorResponse("Failed to update person", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; personId: string }> }
) {
  try {
    const { id, personId } = await params;

    const projectPerson = await prisma.projectPerson.findFirst({
      where: { projectId: id, personId },
      include: { person: true },
    });

    if (!projectPerson) {
      return errorResponse("Person not found in this project", 404);
    }

    await prisma.projectPerson.delete({
      where: { id: projectPerson.id },
    });

    logActivity({
      projectId: id,
      action: "person_removed",
      metadata: { personName: projectPerson.person.name },
    });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Failed to remove person:", error);
    return errorResponse("Failed to remove person", 500);
  }
}
