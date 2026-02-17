import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const summaries = await prisma.markdownSummary.findMany({
      where: { projectId: id },
      orderBy: { generatedAt: "desc" },
      include: {
        sourceFile: { select: { filename: true } },
      },
    });

    return jsonResponse(summaries);
  } catch (error) {
    logger.error("summaries.fetch.failed", { error });
    return errorResponse("Failed to fetch summaries", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
