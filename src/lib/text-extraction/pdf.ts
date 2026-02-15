export async function extractPdf(buffer: Buffer): Promise<string> {
  // pdf-parse doesn't have proper ESM exports, use dynamic require
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return data.text;
}
