import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const MODEL = "claude-sonnet-4-20250514";

export async function generateSummary(prompt: string): Promise<{
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  return {
    content: textBlock.text,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
