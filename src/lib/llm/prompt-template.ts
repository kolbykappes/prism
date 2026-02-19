export const MEETING_TRANSCRIPT_PROMPT = `You are a professional meeting analyst. Transform the following meeting transcript into structured markdown notes optimized for a project knowledge base.

SOURCE FILE: {{filename}}
FILE TYPE: {{fileType}}
{{people}}
INSTRUCTIONS:
- Open with a **Meeting Summary** section: 1–2 sentences capturing the purpose and outcome
- List **Participants** if identifiable (use correct spellings from the Project People list)
- Capture **Key Discussion Points** as organized bullet groups by topic
- Clearly call out **Decisions Made**
- List all **Action Items** with owner and due date if mentioned (format: "- [ ] Action — Owner")
- Note **Next Steps** or follow-up meetings if mentioned
- Preserve important specifics: names, dates, figures, technical details
- Omit filler, side conversations, and repeated content
- Target: roughly 20–30% of source length

SOURCE CONTENT:
{{extractedText}}`;

export const GENERAL_CONTENT_PROMPT = `You are a professional knowledge curator. Transform the following document into well-structured markdown notes suitable for a project knowledge base.

SOURCE FILE: {{filename}}
FILE TYPE: {{fileType}}
{{people}}
INSTRUCTIONS:
- Open with a **Summary** section: 2–4 sentences capturing the document's purpose and main conclusions
- Organize content under clear headings by theme or section
- Preserve key data points, facts, names, dates, and technical details
- Use bullet points for lists; use blockquotes for notable quotes or callouts
- Highlight any **Decisions**, **Recommendations**, or **Action Items** if present
- Use correct spellings of people's names as provided in the Project People list
- Omit boilerplate, filler, and redundant content
- Target: roughly 20–30% of source length

SOURCE CONTENT:
{{extractedText}}`;

export const KB_COMPRESSION_PROMPT = `You are a knowledge base curator. Your task is to compress and synthesize a collection of document summaries into a single, coherent knowledge base document.

Guidelines:
- Preserve all critical information: key decisions, action items, facts, names, dates, and outcomes
- Eliminate redundancy across summaries — consolidate repeated themes
- Organize by topic or theme rather than preserving per-document structure
- Use clear Markdown formatting with headers, bullets, and emphasis where helpful
- Maintain chronological context where it matters (reference specific dates for key events)
- Deprioritize older content when it conflicts with or has been superseded by more recent content
- Write in a dense, reference-friendly style — this will be fed into AI systems, not read casually
- Do NOT include a preamble like "Here is your compressed knowledge base" — start directly with content`;

export function buildPrompt(
  filename: string,
  fileType: string,
  extractedText: string,
  templateContent?: string,
  peopleContext?: string
): string {
  const template = templateContent ?? GENERAL_CONTENT_PROMPT;

  const peopleSection = peopleContext
    ? `\nPROJECT PEOPLE:\n${peopleContext}\n`
    : "";

  return template
    .replace(/\{\{filename\}\}/g, filename)
    .replace(/\{\{fileType\}\}/g, fileType)
    .replace(/\{\{people\}\}/g, peopleSection)
    .replace(/\{\{extractedText\}\}/g, extractedText);
}
