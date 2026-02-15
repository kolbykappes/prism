export async function extractPdf(buffer: Buffer): Promise<string> {
  // pdf-parse v2 exports PDFParse class, needs Uint8Array
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require("pdf-parse");
  const uint8 = new Uint8Array(buffer);
  const parser = new PDFParse(uint8);
  const result = await parser.getText();
  return result.text;
}
