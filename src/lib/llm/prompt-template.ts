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

export const KB_COMPRESSION_EG_PURSUIT_PROMPT = `You are a senior IT consulting sales strategist. Your task is to synthesize a collection of discovery documents, meeting notes, and research into a structured pursuit knowledge base using the MEDDIC sales qualification framework.

This knowledge base will be used by an IT consulting team to understand and advance a sales pursuit. Extract and organize all available signals from the provided content.

Output the following sections in order. If information is unavailable for a section, note it as "Not yet identified" and suggest what to look for.

## Executive Summary
2–4 sentences: the customer's core business challenge, the opportunity for IT consulting engagement, and current pursuit stage.

## Metrics
Quantifiable business value the customer is seeking or has referenced. Include cost savings, efficiency targets, revenue impact, risk reduction, or SLA requirements. Reference specific figures where found.

## Economic Buyer
Who controls budget and final purchasing authority? Include name, title, and any signals about their priorities or concerns. Note if multiple budget owners are involved.

## Decision Criteria
What factors will drive the customer's vendor selection? Include technical requirements, commercial preferences, risk tolerance, compliance needs, and any stated evaluation criteria.

## Decision Process
How will the decision be made and by whom? Include the evaluation timeline, procurement process, committee structure, and any known milestones or gates.

## Identified Pain
The customer's core business and technical pain points driving this initiative. Be specific — generic pain is not useful. Include urgency signals and consequences of inaction.

## Champion
Who inside the customer organization advocates for this engagement or for our approach? Include name, role, level of influence, and their personal motivations where known.

## Competitive Landscape
Known or suspected competitors. Include any intelligence on incumbent vendors, competing bids, or customer preferences that favor or disadvantage our position.

## Key Relationships & People
Important contacts identified across the customer organization. Include name, title, role in the process, and any relationship notes.

## Next Steps & Open Questions
Concrete next steps with owners and target dates. List critical unknowns that must be resolved to advance the pursuit.

Guidelines:
- Synthesize across all documents — do not preserve per-document structure
- Prioritize recency when information conflicts
- Write densely — this will be consumed by AI systems and human analysts
- Do NOT include a preamble — start directly with ## Executive Summary`;


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
