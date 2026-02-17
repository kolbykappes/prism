import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { extractText } from "@/lib/text-extraction";
import { truncateText } from "@/lib/llm/truncation";
import { buildPrompt } from "@/lib/llm/prompt-template";
import { generateSummary } from "@/lib/llm/claude";
import { uploadBlob } from "@/lib/blob";
import { logActivity } from "@/lib/activity";
import { logger } from "@/lib/logger";

export const processFile = inngest.createFunction(
  {
    id: "process-file",
    retries: 1,
    onFailure: async ({ error, event }) => {
      // Safely extract sourceFileId from the failure event
      let sourceFileId: string | undefined;
      try {
        sourceFileId = event.data.event.data.sourceFileId;
      } catch {
        logger.error("process-file.failure-handler.no-source-file-id", {
          eventData: JSON.stringify(event.data).slice(0, 500),
        });
        return;
      }

      const errorMsg =
        error instanceof Error ? error.message : String(error);
      logger.error("process-file.failed", { sourceFileId, error: errorMsg });

      try {
        await prisma.markdownSummary.update({
          where: { sourceFileId },
          data: {
            processingStatus: "failed",
            errorMessage: errorMsg.slice(0, 1000),
          },
        });

        await prisma.processingJob.updateMany({
          where: { sourceFileId, status: "processing" },
          data: {
            status: "failed",
            completedAt: new Date(),
            errorMessage: errorMsg.slice(0, 1000),
          },
        });
      } catch (updateError) {
        logger.error("process-file.failure-handler.db-update-failed", {
          sourceFileId,
          error: updateError,
        });
      }
    },
  },
  { event: "file/uploaded" },
  async ({ event, step }) => {
    const { sourceFileId } = event.data;
    logger.info("process-file.started", { sourceFileId });

    // Step 1: Update status to processing
    const sourceFile = await step.run("update-status", async () => {
      const file = await prisma.sourceFile.findUniqueOrThrow({
        where: { id: sourceFileId },
      });

      await prisma.markdownSummary.update({
        where: { sourceFileId },
        data: { processingStatus: "processing" },
      });

      await prisma.processingJob.updateMany({
        where: { sourceFileId, status: "queued" },
        data: { status: "processing", startedAt: new Date() },
      });

      logger.info("process-file.status-updated", {
        sourceFileId,
        filename: file.filename,
        fileType: file.fileType,
      });

      return file;
    });

    // Step 2: Extract text from file
    const extractedText = await step.run("extract-text", async () => {
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
      const text = await extractText(buffer, sourceFile.fileType);

      logger.info("process-file.text-extracted", {
        sourceFileId,
        textLength: text.length,
      });

      return text;
    });

    // Step 3: Fetch default prompt template, truncate, call Claude
    const result = await step.run("call-claude", async () => {
      const { text, truncated, percentCovered } = truncateText(extractedText);

      // Fetch default prompt template from DB
      const defaultTemplate = await prisma.promptTemplate.findFirst({
        where: { isDefault: true },
      });

      // Fetch project people for context
      const projectPeople = await prisma.projectPerson.findMany({
        where: { projectId: sourceFile.projectId },
        include: { person: true },
      });

      const peopleContext = projectPeople.length > 0
        ? projectPeople.map((pp) => {
            const p = pp.person;
            const parts = [`- ${p.name}`];
            if (p.email) parts[0] += ` <${p.email}>`;
            if (pp.role || p.role) parts[0] += ` (${pp.role || p.role})`;
            if (p.organization) parts[0] += ` — ${p.organization}`;
            return parts[0];
          }).join("\n")
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

      // Log token usage
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

      // Prepend truncation warning if needed
      let finalContent = content;
      if (truncated) {
        finalContent = `> Note: The source document was truncated to fit processing limits. This summary covers approximately the first ${percentCovered}% of the document.\n\n${content}`;
      }

      return {
        content: finalContent,
        model,
        inputTokens,
        outputTokens,
        truncated,
        promptTemplateId: defaultTemplate?.id ?? null,
      };
    });

    // Step 4: Store result
    await step.run("store-result", async () => {
      logger.info("process-file.storing-result", { sourceFileId });

      // Upload summary markdown to blob
      const blobPath = `projects/${sourceFile.projectId}/summaries/${sourceFile.id}.md`;
      const blobUrl = await uploadBlob(
        blobPath,
        result.content,
        "text/markdown"
      );

      // Update summary record
      await prisma.markdownSummary.update({
        where: { sourceFileId },
        data: {
          content: result.content,
          blobUrl,
          generatedAt: new Date(),
          llmModel: result.model,
          processingStatus: "complete",
          tokenCount: result.inputTokens,
          truncated: result.truncated,
          promptTemplateId: result.promptTemplateId,
          errorMessage: null,
        },
      });

      // Update processing job
      await prisma.processingJob.updateMany({
        where: { sourceFileId, status: "processing" },
        data: { status: "complete", completedAt: new Date() },
      });

      // Touch project updatedAt
      await prisma.project.update({
        where: { id: sourceFile.projectId },
        data: { updatedAt: new Date() },
      });
    });

    logActivity({
      projectId: sourceFile.projectId,
      action: "summary_completed",
      sourceFileId,
      metadata: { filename: sourceFile.filename },
    });

    logger.info("process-file.completed", { sourceFileId, filename: sourceFile.filename });

    return { success: true, sourceFileId };
  }
);
