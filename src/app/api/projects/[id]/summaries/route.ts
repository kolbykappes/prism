import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const summaries = await prisma.markdownSummary.findMany({
    where: { projectId: id },
    orderBy: { generatedAt: "desc" },
    include: {
      sourceFile: { select: { filename: true } },
    },
  });

  return jsonResponse(summaries);
}
