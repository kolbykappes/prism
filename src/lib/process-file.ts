import { prisma } from "@/lib/prisma";
import { extractText } from "@/lib/text-extraction";
import { extractContentDate } from "@/lib/extract-content-date";
import { truncateText } from "@/lib/llm/truncation";
import { buildPrompt } from "@/lib/llm/prompt-template";
import { generateSummary } from "@/lib/llm/claude";
import { detectFileIntent } from "@/lib/detect-file-intent";
import { uploadBlob } from "@/lib/blob";
import { logActivity } from "@/lib/activity";
import { logger } from "@/lib/logger";

export async function processFile(sourceFileId: string): Promise<void> {
  logger.info("process-file.started", { sourceFileId });

  try {
    // Step 1: Update status to processing
    const sourceFile = await prisma.sourceFile.findUniqueOrThrow({
      where: { id: sourceFileId },
    });

    await prisma.markdownSummary.update({
      where: { sourceFileId },
      data: { processingStatus: "processing" },
    });

    const queuedJob = await prisma.processingJob.findFirst({
      where: { sourceFileId, status: "queued" },
    });
    if (queuedJob) {
      await prisma.processingJob.update({
        where: { id: queuedJob.id },
        data: { status: "processing", startedAt: new Date() },
      });
    }

    logger.info("process-file.status-updated", {
      sourceFileId,
      filename: sourceFile.filename,
      fileType: sourceFile.fileType,
    });

    // Step 2: Fetch blob and extract text
    logger.info("process-file.extracting-text", {
      sourceFileId,
      blobUrl: sourceFile.blobUrl,
    });

    const response = await fetch(sourceFile.blobUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch blob: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extractedText = await extractText(buffer, sourceFile.fileType);

    // Extract content date (skip if already manually set)
    if (sourceFile.contentDateSource !== "manual") {
      const { date, source } = extractContentDate(buffer, sourceFile.fileType, sourceFile.filename);
      await prisma.sourceFile.update({
        where: { id: sourceFileId },
        data: {
          contentDate: date ?? sourceFile.uploadedAt,
          contentDateSource: source ?? "uploaded",
        },
      });
      logger.info("process-file.content-date", { sourceFileId, contentDate: date, source: source ?? "uploaded" });
    }

    logger.info("process-file.text-extracted", {
      sourceFileId,
      textLength: extractedText.length,
    });

    // Step 3: Truncate, build prompt, call Claude
    const { text, truncated, percentCovered } = truncateText(extractedText);

    // Determine which prompt slug to use based on file type
    let promptSlug: string;
    if (sourceFile.fileType === "vtt" || sourceFile.fileType === "srt") {
      promptSlug = "meeting_transcript";
    } else if (sourceFile.fileType === "txt") {
      const intent = await detectFileIntent(extractedText);
      promptSlug = intent === "transcript" ? "meeting_transcript" : "general_content";
      logger.info("process-file.txt-intent-detected", { sourceFileId, intent, promptSlug });
    } else {
      // pdf, md, email, ics
      promptSlug = "general_content";
    }

    const matchedTemplate = await prisma.promptTemplate.findFirst({
      where: { slug: promptSlug },
    });
    // Fall back to any isDefault template if the slug isn't seeded yet
    const defaultTemplate =
      matchedTemplate ??
      (await prisma.promptTemplate.findFirst({ where: { isDefault: true } }));

    logger.info("process-file.prompt-selected", {
      sourceFileId,
      promptSlug,
      templateId: defaultTemplate?.id ?? null,
      templateName: defaultTemplate?.name ?? "hardcoded fallback",
    });

    const projectPeople = await prisma.projectPerson.findMany({
      where: { projectId: sourceFile.projectId },
      include: { person: true },
    });

    const peopleContext =
      projectPeople.length > 0
        ? projectPeople
            .map((pp) => {
              const p = pp.person;
              const parts = [`- ${p.name}`];
              if (p.email) parts[0] += ` <${p.email}>`;
              if (pp.role || p.role) parts[0] += ` (${pp.role || p.role})`;
              if (p.organization) parts[0] += ` — ${p.organization}`;
              return parts[0];
            })
            .join("\n")
        : undefined;

    const prompt = buildPrompt(
      sourceFile.filename,
      sourceFile.fileType,
      text,
      defaultTemplate?.content,
      peopleContext
    );

    logger.info("process-file.calling-claude", {
      sourceFileId,
      filename: sourceFile.filename,
      promptLength: prompt.length,
      truncated,
      percentCovered,
      peopleCount: projectPeople.length,
    });

    const startMs = Date.now();
    const { content, model, inputTokens, outputTokens } =
      await generateSummary(prompt);
    const durationMs = Date.now() - startMs;

    logger.info("process-file.claude-responded", {
      sourceFileId,
      model,
      inputTokens,
      outputTokens,
      durationMs,
    });

    await prisma.llmUsageLog.create({
      data: {
        sourceFileId,
        projectId: sourceFile.projectId,
        model,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        durationMs,
      },
    });

    let finalContent = content;
    if (truncated) {
      finalContent = `> Note: The source document was truncated to fit processing limits. This summary covers approximately the first ${percentCovered}% of the document.\n\n${content}`;
    }

    // Step 4: Store result
    logger.info("process-file.storing-result", { sourceFileId });

    const blobPath = `projects/${sourceFile.projectId}/summaries/${sourceFile.id}.md`;
    const blobUrl = await uploadBlob(blobPath, finalContent, "text/markdown");

    await prisma.markdownSummary.update({
      where: { sourceFileId },
      data: {
        content: finalContent,
        blobUrl,
        generatedAt: new Date(),
        llmModel: model,
        processingStatus: "complete",
        tokenCount: inputTokens,
        truncated,
        promptTemplateId: defaultTemplate?.id ?? null,
        errorMessage: null,
      },
    });

    const processingJob = await prisma.processingJob.findFirst({
      where: { sourceFileId, status: "processing" },
    });
    if (processingJob) {
      await prisma.processingJob.update({
        where: { id: processingJob.id },
        data: { status: "complete", completedAt: new Date() },
      });
    }

    await prisma.project.update({
      where: { id: sourceFile.projectId },
      data: { updatedAt: new Date() },
    });

    logActivity({
      projectId: sourceFile.projectId,
      action: "summary_completed",
      sourceFileId,
      metadata: { filename: sourceFile.filename },
    });

    logger.info("process-file.completed", {
      sourceFileId,
      filename: sourceFile.filename,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("process-file.failed", { sourceFileId, error: errorMsg });

    try {
      await prisma.markdownSummary.update({
        where: { sourceFileId },
        data: {
          processingStatus: "failed",
          errorMessage: errorMsg.slice(0, 1000),
        },
      });

      const failingJob = await prisma.processingJob.findFirst({
        where: { sourceFileId, status: "processing" },
      });
      if (failingJob) {
        await prisma.processingJob.update({
          where: { id: failingJob.id },
          data: {
            status: "failed",
            completedAt: new Date(),
            errorMessage: errorMsg.slice(0, 1000),
          },
        });
      }
    } catch (updateError) {
      logger.error("process-file.failure-handler.db-update-failed", {
        sourceFileId,
        error: updateError,
      });
    }
  }
}
