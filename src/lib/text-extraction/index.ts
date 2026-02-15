import { extractTxt } from "./txt";
import { extractVtt } from "./vtt";
import { extractSrt } from "./srt";
import { extractPdf } from "./pdf";

export async function extractText(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  switch (fileType) {
    case "txt":
    case "md":
      return extractTxt(buffer);
    case "vtt":
      return extractVtt(buffer);
    case "srt":
      return extractSrt(buffer);
    case "pdf":
      return await extractPdf(buffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
