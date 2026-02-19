/**
 * Attempts to determine when a piece of content was originally created.
 * Returns { date, source } where source is "extracted" on success.
 * Returns { date: null, source: null } when no date can be determined —
 * the caller should fall back to uploadedAt.
 */
export function extractContentDate(
  buffer: Buffer,
  fileType: string,
  filename: string
): { date: Date | null; source: "extracted" | null } {
  // Try file-type-specific extraction first, then filename fallback
  const byType = extractByFileType(buffer, fileType);
  if (byType) return { date: byType, source: "extracted" };

  const byFilename = extractFromFilename(filename);
  if (byFilename) return { date: byFilename, source: "extracted" };

  return { date: null, source: null };
}

function extractByFileType(buffer: Buffer, fileType: string): Date | null {
  try {
    switch (fileType) {
      case "email":
        return extractFromEmail(buffer);
      case "ics":
        return extractFromIcs(buffer);
      case "vtt":
      case "srt":
        // Transcripts rely on filename (set by recording app) — no reliable in-file date
        return null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/** Parse the Date: header from a raw .eml file */
function extractFromEmail(buffer: Buffer): Date | null {
  const text = buffer.toString("utf-8", 0, 4096); // Only need the headers
  const match = text.match(/^Date:\s*(.+)$/im);
  if (!match) return null;
  const d = new Date(match[1].trim());
  return isValidDate(d) ? d : null;
}

/** Parse DTSTART from a .ics file */
function extractFromIcs(buffer: Buffer): Date | null {
  const text = buffer.toString("utf-8", 0, 8192);
  // Handles both DTSTART:20240115T100000Z and DTSTART;TZID=...:20240115T100000
  const match = text.match(/^DTSTART(?:;[^:]+)?:(\d{8}T\d{6}Z?)/im);
  if (!match) return null;
  const raw = match[1]; // e.g. 20240115T100000Z
  const d = new Date(
    `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(9, 11)}:${raw.slice(11, 13)}:${raw.slice(13, 15)}${raw.endsWith("Z") ? "Z" : ""}`
  );
  return isValidDate(d) ? d : null;
}

/**
 * Try to extract a date from the filename.
 * Handles common patterns:
 *   - 2024-01-15  (ISO)
 *   - 20240115    (compact ISO)
 *   - Jan 15 2024, January 15 2024 (English month names)
 *   - Otter: "Meeting 2024-01-15 10.00 AM"
 */
function extractFromFilename(filename: string): Date | null {
  // Strip extension
  const base = filename.replace(/\.[^.]+$/, "");

  // ISO date: YYYY-MM-DD
  const isoMatch = base.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T12:00:00Z`);
    if (isValidDate(d)) return d;
  }

  // Compact ISO: YYYYMMDD (8 digits, not part of longer number)
  const compactMatch = base.match(/(?<!\d)(\d{4})(\d{2})(\d{2})(?!\d)/);
  if (compactMatch) {
    const d = new Date(`${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}T12:00:00Z`);
    if (isValidDate(d)) return d;
  }

  // Month name: Jan 15 2024, January 15 2024, 15 Jan 2024
  const monthNames =
    "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
  const monthMatch = base.match(
    new RegExp(`(${monthNames})\\s+(\\d{1,2})[,\\s]+(\\d{4})`, "i")
  );
  if (monthMatch) {
    const d = new Date(`${monthMatch[1]} ${monthMatch[2]} ${monthMatch[3]}`);
    if (isValidDate(d)) return d;
  }

  return null;
}

function isValidDate(d: Date): boolean {
  if (isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  return year >= 2000 && year <= 2100;
}
