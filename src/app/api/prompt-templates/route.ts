import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  try {
    const templates = await prisma.promptTemplate.findMany({
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
    return jsonResponse(templates);
  } catch (error) {
    console.error("Failed to fetch prompt templates:", error);
    return errorResponse("Failed to fetch prompt templates", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, content, isDefault } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return errorResponse("Template name is required");
    }
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return errorResponse("Template content is required");
    }

    // If setting as default, unset current default
    if (isDefault) {
      await prisma.promptTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.promptTemplate.create({
      data: {
        name: name.trim(),
        content: content.trim(),
        isDefault: isDefault ?? false,
      },
    });

    return jsonResponse(template, 201);
  } catch (error) {
    console.error("Failed to create prompt template:", error);
    return errorResponse("Failed to create prompt template", 500);
  }
}
