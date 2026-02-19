import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { logger } from "@/lib/logger";

const anthropic = new Anthropic();
const MODEL = "claude-haiku-4-5-20251001";

const COMPRESSION_SYSTEM_PROMPT = `You are a knowledge base curator. Your task is to compress and synthesize a collection of document summaries into a single, coherent knowledge base document.

Guidelines:
- Preserve all critical information: key decisions, action items, facts, names, dates, and outcomes
- Eliminate redundancy across summaries — consolidate repeated themes
- Organize by topic or theme rather than preserving per-document structure
- Use clear Markdown formatting with headers, bullets, and emphasis where helpful
- Maintain chronological context where it matters (reference specific dates for key events)
- Deprioritize older content when it conflicts with or has been superseded by more recent content
- Write in a dense, reference-friendly style — this will be fed into AI systems, not read casually
- Do NOT include a preamble like "Here is your compressed knowledge base" — start directly with content`;

export async function compressKb(projectId: string, targetTokens: number): Promise<void> {
  logger.info("compress-kb.started", { projectId, targetTokens });

  try {
    // Fetch all complete summaries ordered by content date ascending (oldest → newest)
    const summaries = await prisma.markdownSummary.findMany({
      where: { projectId, processingStatus: "complete" },
      include: {
        sourceFile: {
          select: { filename: true, contentDate: true, contentDateSource: true, uploadedAt: true },
        },
      },
      orderBy: [{ sourceFile: { contentDate: "asc" } }],
    });

    if (summaries.length === 0) {
      logger.warn("compress-kb.no-summaries", { projectId });
      return;
    }

    const completeSummaries = summaries.filter((s) => s.content);
    if (completeSummaries.length === 0) {
      logger.warn("compress-kb.no-content", { projectId });
      return;
    }

    // Build the user message with dated summaries
    const sections = completeSummaries.map((s) => {
      const effectiveDate = s.sourceFile.contentDate ?? s.sourceFile.uploadedAt;
      const dateStr = effectiveDate.toISOString().slice(0, 10);
      const dateSource = s.sourceFile.contentDateSource ?? "uploaded";
      return `## ${s.sourceFile.filename}\n_Content date: ${dateStr} (${dateSource})_\n\n${s.content}`;
    });

    const userMessage = `The following are document summaries from a project knowledge base, ordered from oldest to most recent. Please compress them into a single unified knowledge base document of approximately ${targetTokens} tokens.

${sections.join("\n\n---\n\n")}`;

    logger.info("compress-kb.calling-claude", {
      projectId,
      summaryCount: completeSummaries.length,
      targetTokens,
    });

    const startMs = Date.now();
    const response = await anthropic.messages.create(
      {
        model: MODEL,
        max_tokens: Math.min(targetTokens * 2, 8192), // Allow headroom but cap at 8192
        system: COMPRESSION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      },
      { signal: AbortSignal.timeout(240_000) }
    );
    const durationMs = Date.now() - startMs;

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content in Claude response");
    }

    const compressedContent = textBlock.text;
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    logger.info("compress-kb.claude-responded", {
      projectId,
      model: response.model,
      inputTokens,
      outputTokens,
      durationMs,
    });

    // Log LLM usage
    await prisma.llmUsageLog.create({
      data: {
        projectId,
        model: response.model,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        durationMs,
      },
    });

    // Store compressed KB on the project
    await prisma.project.update({
      where: { id: projectId },
      data: {
        compressedKb: compressedContent,
        compressedKbAt: new Date(),
        compressedKbTokenCount: outputTokens,
        updatedAt: new Date(),
      },
    });

    logActivity({
      projectId,
      action: "kb_compressed",
      metadata: { targetTokens, outputTokens, summaryCount: completeSummaries.length },
    });

    logger.info("compress-kb.completed", { projectId, outputTokens });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("compress-kb.failed", { projectId, error: errorMsg });
    throw error;
  }
}
