export function buildPrompt(
  filename: string,
  fileType: string,
  extractedText: string
): string {
  return `You are a professional knowledge curator. Transform the following source content into well-structured markdown notes suitable for use as reference material in an AI assistant's project knowledge base.

SOURCE FILE: ${filename}
FILE TYPE: ${fileType}

INSTRUCTIONS:
- Create clear, scannable markdown with appropriate headings
- For meeting transcripts: extract key discussion points, decisions, action items, and next steps
- For documents: summarize main themes, key data points, and conclusions
- For all content: preserve important specifics (names, dates, numbers, technical details)
- Use bullet points for lists of items
- Use blockquotes for important quotes or callouts
- Omit filler, tangents, and redundant content
- If the content includes participants/speakers, list them at the top
- Target output length: roughly 20-30% of source length (concise but comprehensive)

SOURCE CONTENT:
${extractedText}`;
}
