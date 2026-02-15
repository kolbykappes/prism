export function extractSrt(buffer: Buffer): string {
  const text = buffer.toString("utf-8");
  const lines = text.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Skip sequence numbers
    if (/^\d+$/.test(trimmed)) continue;

    // Skip timestamp lines
    if (trimmed.includes("-->")) continue;

    // Keep dialogue text
    result.push(trimmed);
  }

  return result.join("\n");
}
