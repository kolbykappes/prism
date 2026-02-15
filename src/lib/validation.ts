const ALLOWED_EXTENSIONS = [".txt", ".vtt", ".srt", ".pdf", ".md"] as const;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export function validateFileType(filename: string): AllowedExtension | null {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)
    ? (ext as AllowedExtension)
    : null;
}

export function validateFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

export function extensionToFileType(ext: AllowedExtension): string {
  return ext.replace(".", "");
}
