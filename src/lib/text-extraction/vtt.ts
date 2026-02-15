export function extractVtt(buffer: Buffer): string {
  const text = buffer.toString("utf-8");
  const lines = text.split("\n");
  const result: string[] = [];

  let skipNext = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip WEBVTT header and metadata
    if (trimmed === "WEBVTT" || trimmed.startsWith("NOTE") || trimmed === "") {
      skipNext = false;
      continue;
    }

    // Skip timestamp lines (00:00:00.000 --> 00:00:00.000)
    if (trimmed.includes("-->")) {
      skipNext = false;
      continue;
    }

    // Skip cue identifiers (numeric lines before timestamps)
    if (/^\d+$/.test(trimmed)) {
      skipNext = true;
      continue;
    }

    if (skipNext) {
      skipNext = false;
      // This might be a timestamp line that was already handled
      if (trimmed.includes("-->")) continue;
    }

    // Keep speaker labels and dialogue
    if (trimmed) {
      result.push(trimmed);
    }
  }

  return result.join("\n");
}
