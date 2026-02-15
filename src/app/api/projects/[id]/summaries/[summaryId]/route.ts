import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; summaryId: string }> }
) {
  const { id, summaryId } = await params;

  const summary = await prisma.markdownSummary.findFirst({
    where: { id: summaryId, projectId: id },
    include: {
      sourceFile: { select: { filename: true, fileType: true } },
    },
  });

  if (!summary) {
    return errorResponse("Summary not found", 404);
  }

  return jsonResponse(summary);
}
