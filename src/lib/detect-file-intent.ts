import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";

const anthropic = new Anthropic();

/**
 * Uses a lightweight Claude call (~500 chars of the file) to decide whether
 * a .txt file is a meeting transcript/conversation or a general document.
 * Falls back to "document" on any error.
 */
export async function detectFileIntent(
  text: string
): Promise<"transcript" | "document"> {
  const sample = text.slice(0, 500);

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 5,
      messages: [
        {
          role: "user",
          content: `Look at this text sample and respond with ONE word only — either "transcript" (if it appears to be a meeting transcript, interview, or conversation with speaker labels or timestamps) or "document" (if it appears to be a report, article, email, or general document).\n\nTEXT:\n${sample}`,
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return "document";

    const result = block.text.toLowerCase().trim();
    return result.includes("transcript") ? "transcript" : "document";
  } catch (error) {
    logger.warn("detect-file-intent.failed", { error });
    return "document";
  }
}
