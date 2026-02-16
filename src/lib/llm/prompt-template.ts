const DEFAULT_TEMPLATE = `You are a professional knowledge curator. Transform the following source content into well-structured markdown notes suitable for use as reference material in an AI assistant's project knowledge base.

SOURCE FILE: {{filename}}
FILE TYPE: {{fileType}}
{{people}}
INSTRUCTIONS:
- Create clear, scannable markdown with appropriate headings
- For meeting transcripts: extract key discussion points, decisions, action items, and next steps
- For documents: summarize main themes, key data points, and conclusions
- For all content: preserve important specifics (names, dates, numbers, technical details)
- Use bullet points for lists of items
- Use blockquotes for important quotes or callouts
- Omit filler, tangents, and redundant content
- If the content includes participants/speakers, list them at the top
- Use the correct spelling of people's names as provided in the project people list above
- Target output length: roughly 20-30% of source length (concise but comprehensive)

SOURCE CONTENT:
{{extractedText}}`;

export function buildPrompt(
  filename: string,
  fileType: string,
  extractedText: string,
  templateContent?: string,
  peopleContext?: string
): string {
  const template = templateContent ?? DEFAULT_TEMPLATE;

  const peopleSection = peopleContext
    ? `\nPROJECT PEOPLE:\n${peopleContext}\n`
    : "";

  return template
    .replace(/\{\{filename\}\}/g, filename)
    .replace(/\{\{fileType\}\}/g, fileType)
    .replace(/\{\{people\}\}/g, peopleSection)
    .replace(/\{\{extractedText\}\}/g, extractedText);
}

export function getDefaultTemplateContent(): string {
  return DEFAULT_TEMPLATE;
}
