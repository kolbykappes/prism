const MAX_CHARS = 720_000; // ~180K tokens at 4 chars/token

export interface TruncationResult {
  text: string;
  truncated: boolean;
  percentCovered: number;
}

export function truncateText(text: string): TruncationResult {
  if (text.length <= MAX_CHARS) {
    return { text, truncated: false, percentCovered: 100 };
  }

  const truncatedText = text.substring(0, MAX_CHARS);
  const percentCovered = Math.round((MAX_CHARS / text.length) * 100);

  return {
    text: truncatedText,
    truncated: true,
    percentCovered,
  };
}
