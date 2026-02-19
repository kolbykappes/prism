import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { logger } from "@/lib/logger";
import { KB_COMPRESSION_PROMPT, KB_COMPRESSION_EG_PURSUIT_PROMPT } from "@/lib/llm/prompt-template";

const anthropic = new Anthropic();
const MODEL = "claude-haiku-4-5-20251001";

export async function compressKb(projectId: string, targetTokens: number): Promise<void> {
  logger.info("compress-kb.started", { projectId, targetTokens });

  try {
    // Fetch project with type and company/BU context
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        projectType: true,
        company: { select: { name: true, markdownContent: true } },
        businessUnit: { select: { name: true, markdownContent: true } },
      },
    });

    // Select compression prompt based on project type
    const isEgPursuit = project?.projectType === "EG_PURSUIT";
    const compressionSlug = isEgPursuit ? "kb_compression_eg_pursuit" : "kb_compression";
    const fallbackPrompt = isEgPursuit ? KB_COMPRESSION_EG_PURSUIT_PROMPT : KB_COMPRESSION_PROMPT;

    const compressionTemplate = await prisma.promptTemplate.findFirst({
      where: { slug: compressionSlug },
    });
    const systemPrompt = compressionTemplate?.content ?? fallbackPrompt;

    logger.info("compress-kb.prompt-selected", {
      projectId,
      projectType: project?.projectType ?? "DELIVERY",
      slug: compressionSlug,
      templateId: compressionTemplate?.id ?? null,
      source: compressionTemplate ? "db" : "hardcoded",
    });

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

    // Build company/BU context preamble
    const contextSections: string[] = [];
    if (project?.company?.markdownContent) {
      contextSections.push(`## Company Context: ${project.company.name}\n\n${project.company.markdownContent}`);
    }
    if (project?.businessUnit?.markdownContent) {
      contextSections.push(`## Business Unit Context: ${project.businessUnit.name}\n\n${project.businessUnit.markdownContent}`);
    }

    // Build the user message with dated summaries
    const sections = completeSummaries.map((s) => {
      const effectiveDate = s.sourceFile.contentDate ?? s.sourceFile.uploadedAt;
      const dateStr = effectiveDate.toISOString().slice(0, 10);
      const dateSource = s.sourceFile.contentDateSource ?? "uploaded";
      return `## ${s.sourceFile.filename}\n_Content date: ${dateStr} (${dateSource})_\n\n${s.content}`;
    });

    const contextPreamble = contextSections.length > 0
      ? `The following context documents are provided for reference:\n\n${contextSections.join("\n\n---\n\n")}\n\n---\n\n`
      : "";

    const userMessage = `${contextPreamble}The following are document summaries from a project knowledge base, ordered from oldest to most recent. Please compress them into a single unified knowledge base document of approximately ${targetTokens} tokens.

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
        system: systemPrompt,
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
