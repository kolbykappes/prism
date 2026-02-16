import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { extractText } from "@/lib/text-extraction";
import { truncateText } from "@/lib/llm/truncation";
import { buildPrompt } from "@/lib/llm/prompt-template";
import { generateSummary } from "@/lib/llm/claude";
import { uploadBlob } from "@/lib/blob";
import { logActivity } from "@/lib/activity";

export const processFile = inngest.createFunction(
  {
    id: "process-file",
    retries: 1,
  },
  { event: "file/uploaded" },
  async ({ event, step }) => {
    const { sourceFileId } = event.data;

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

      return file;
    });

    // Step 2: Extract text from file
    const extractedText = await step.run("extract-text", async () => {
      const response = await fetch(sourceFile.blobUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return extractText(buffer, sourceFile.fileType);
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

      const { content, model, inputTokens } = await generateSummary(prompt);

      // Prepend truncation warning if needed
      let finalContent = content;
      if (truncated) {
        finalContent = `> Note: The source document was truncated to fit processing limits. This summary covers approximately the first ${percentCovered}% of the document.\n\n${content}`;
      }

      return {
        content: finalContent,
        model,
        inputTokens,
        truncated,
        promptTemplateId: defaultTemplate?.id ?? null,
      };
    });

    // Step 4: Store result
    await step.run("store-result", async () => {
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

    return { success: true, sourceFileId };
  }
);
