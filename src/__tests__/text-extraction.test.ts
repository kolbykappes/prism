import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { extractTxt } from "../lib/text-extraction/txt";
import { extractVtt } from "../lib/text-extraction/vtt";
import { extractSrt } from "../lib/text-extraction/srt";
import { extractPdf } from "../lib/text-extraction/pdf";
import { extractText } from "../lib/text-extraction";
import { truncateText } from "../lib/llm/truncation";
import { buildPrompt } from "../lib/llm/prompt-template";
import {
  validateFileType,
  validateFileSize,
  extensionToFileType,
} from "../lib/validation";

const TEST_DOCS_DIR = join(__dirname, "../../test-docs");

// --- Validation tests ---

describe("validation", () => {
  it("accepts valid file extensions", () => {
    expect(validateFileType("file.txt")).toBe(".txt");
    expect(validateFileType("file.vtt")).toBe(".vtt");
    expect(validateFileType("file.srt")).toBe(".srt");
    expect(validateFileType("file.pdf")).toBe(".pdf");
    expect(validateFileType("file.md")).toBe(".md");
  });

  it("rejects invalid file extensions", () => {
    expect(validateFileType("file.docx")).toBeNull();
    expect(validateFileType("file.exe")).toBeNull();
    expect(validateFileType("file.jpg")).toBeNull();
    expect(validateFileType("noextension")).toBeNull();
  });

  it("is case-insensitive for extensions", () => {
    expect(validateFileType("file.TXT")).toBe(".txt");
    expect(validateFileType("file.PDF")).toBe(".pdf");
  });

  it("validates file size within limits", () => {
    expect(validateFileSize(1)).toBe(true);
    expect(validateFileSize(1024)).toBe(true);
    expect(validateFileSize(50 * 1024 * 1024)).toBe(true); // exactly 50MB
  });

  it("rejects invalid file sizes", () => {
    expect(validateFileSize(0)).toBe(false);
    expect(validateFileSize(-1)).toBe(false);
    expect(validateFileSize(50 * 1024 * 1024 + 1)).toBe(false); // over 50MB
  });

  it("converts extension to file type", () => {
    expect(extensionToFileType(".txt")).toBe("txt");
    expect(extensionToFileType(".pdf")).toBe("pdf");
    expect(extensionToFileType(".md")).toBe("md");
  });
});

// --- TXT extraction tests ---

describe("txt extraction", () => {
  it("extracts text from AI Platform Strategy Meeting transcript", () => {
    const buffer = readFileSync(
      join(TEST_DOCS_DIR, "AI Platform Strategy Meeting_otter_ai.txt")
    );
    const text = extractTxt(buffer);

    expect(text).toBeTruthy();
    expect(text.length).toBeGreaterThan(1000);
    expect(text).toContain("Speaker 1");
    expect(text).toContain("Speaker 2");
  });

  it("extracts text from Kirby Consignment transcript", () => {
    const buffer = readFileSync(
      join(TEST_DOCS_DIR, "Kirby Consignment Biz Planning_otter_ai.txt")
    );
    const text = extractTxt(buffer);

    expect(text).toBeTruthy();
    expect(text.length).toBeGreaterThan(1000);
    expect(text).toContain("Kolby Kappes");
  });

  it("extracts text from Ragged Mountain transcript", () => {
    const buffer = readFileSync(
      join(TEST_DOCS_DIR, "Ragged Mountain Project Update_otter_ai.txt")
    );
    const text = extractTxt(buffer);

    expect(text).toBeTruthy();
    expect(text.length).toBeGreaterThan(1000);
    expect(text).toContain("Kolby Kappes");
    expect(text).toContain("ragged mountain");
  });
});

// --- PDF extraction tests ---

describe("pdf extraction", () => {
  it("extracts text from the PDF file", async () => {
    const buffer = readFileSync(
      join(TEST_DOCS_DIR, "DeleteRisk Website changes.pdf")
    );
    const text = await extractPdf(buffer);

    expect(text).toBeTruthy();
    expect(text.length).toBeGreaterThan(100);
    // PDF should contain some readable content
    expect(typeof text).toBe("string");
  });

  it("returns non-empty string from PDF", async () => {
    const buffer = readFileSync(
      join(TEST_DOCS_DIR, "DeleteRisk Website changes.pdf")
    );
    const text = await extractPdf(buffer);

    // Verify it's not just whitespace
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

// --- VTT extraction tests ---

describe("vtt extraction", () => {
  it("strips WEBVTT header and timestamps from VTT content", () => {
    const vttContent = `WEBVTT

1
00:00:00.000 --> 00:00:05.000
Speaker 1: Hello everyone, welcome to the meeting.

2
00:00:05.000 --> 00:00:10.000
Speaker 2: Thank you for having us.

3
00:00:10.000 --> 00:00:15.000
Speaker 1: Let's get started with the agenda.`;

    const buffer = Buffer.from(vttContent, "utf-8");
    const text = extractVtt(buffer);

    expect(text).toContain("Speaker 1: Hello everyone");
    expect(text).toContain("Speaker 2: Thank you");
    expect(text).toContain("Let's get started");
    expect(text).not.toContain("WEBVTT");
    expect(text).not.toContain("-->");
    expect(text).not.toContain("00:00:00");
  });

  it("preserves speaker labels", () => {
    const vttContent = `WEBVTT

00:00:00.000 --> 00:00:05.000
John: Good morning.

00:00:05.000 --> 00:00:10.000
Jane: Morning, John.`;

    const buffer = Buffer.from(vttContent, "utf-8");
    const text = extractVtt(buffer);

    expect(text).toContain("John: Good morning");
    expect(text).toContain("Jane: Morning");
  });
});

// --- SRT extraction tests ---

describe("srt extraction", () => {
  it("strips sequence numbers and timestamps from SRT content", () => {
    const srtContent = `1
00:00:00,000 --> 00:00:05,000
Hello everyone.

2
00:00:05,000 --> 00:00:10,000
Welcome to the meeting.

3
00:00:10,000 --> 00:00:15,000
Let's begin.`;

    const buffer = Buffer.from(srtContent, "utf-8");
    const text = extractSrt(buffer);

    expect(text).toContain("Hello everyone.");
    expect(text).toContain("Welcome to the meeting.");
    expect(text).toContain("Let's begin.");
    expect(text).not.toContain("-->");
    expect(text).not.toContain("00:00:00");
  });
});

// --- extractText dispatcher tests ---

describe("extractText dispatcher", () => {
  it("dispatches txt files to txt extractor", async () => {
    const buffer = readFileSync(
      join(TEST_DOCS_DIR, "Ragged Mountain Project Update_otter_ai.txt")
    );
    const text = await extractText(buffer, "txt");

    expect(text).toContain("Kolby Kappes");
  });

  it("dispatches md files to txt extractor", async () => {
    const mdContent = "# Hello\n\nThis is markdown content.";
    const buffer = Buffer.from(mdContent, "utf-8");
    const text = await extractText(buffer, "md");

    expect(text).toContain("# Hello");
    expect(text).toContain("markdown content");
  });

  it("dispatches pdf files to pdf extractor", async () => {
    const buffer = readFileSync(
      join(TEST_DOCS_DIR, "DeleteRisk Website changes.pdf")
    );
    const text = await extractText(buffer, "pdf");

    expect(text).toBeTruthy();
    expect(text.length).toBeGreaterThan(0);
  });

  it("throws for unsupported file types", async () => {
    const buffer = Buffer.from("test", "utf-8");
    await expect(extractText(buffer, "docx")).rejects.toThrow(
      "Unsupported file type"
    );
  });
});

// --- Truncation tests ---

describe("truncation", () => {
  it("does not truncate short text", () => {
    const result = truncateText("Hello world");
    expect(result.truncated).toBe(false);
    expect(result.percentCovered).toBe(100);
    expect(result.text).toBe("Hello world");
  });

  it("truncates text exceeding 720K chars", () => {
    const longText = "a".repeat(800_000);
    const result = truncateText(longText);

    expect(result.truncated).toBe(true);
    expect(result.text.length).toBe(720_000);
    expect(result.percentCovered).toBe(90); // 720000/800000 = 90%
  });

  it("does not truncate text at exactly 720K chars", () => {
    const exactText = "b".repeat(720_000);
    const result = truncateText(exactText);

    expect(result.truncated).toBe(false);
    expect(result.percentCovered).toBe(100);
  });

  it("truncates real transcript files correctly", () => {
    const buffer = readFileSync(
      join(TEST_DOCS_DIR, "AI Platform Strategy Meeting_otter_ai.txt")
    );
    const text = buffer.toString("utf-8");
    const result = truncateText(text);

    // These files are well under 720K, so should not be truncated
    expect(result.truncated).toBe(false);
    expect(result.percentCovered).toBe(100);
    expect(result.text).toBe(text);
  });
});

// --- Prompt template tests ---

describe("prompt template", () => {
  it("builds prompt with filename and content", () => {
    const prompt = buildPrompt("meeting.txt", "txt", "Hello world");

    expect(prompt).toContain("SOURCE FILE: meeting.txt");
    expect(prompt).toContain("FILE TYPE: txt");
    expect(prompt).toContain("SOURCE CONTENT:");
    expect(prompt).toContain("Hello world");
    expect(prompt).toContain("professional knowledge curator");
  });

  it("builds prompt from real transcript", () => {
    const buffer = readFileSync(
      join(TEST_DOCS_DIR, "Ragged Mountain Project Update_otter_ai.txt")
    );
    const text = buffer.toString("utf-8");
    const prompt = buildPrompt(
      "Ragged Mountain Project Update_otter_ai.txt",
      "txt",
      text
    );

    expect(prompt).toContain("Ragged Mountain Project Update_otter_ai.txt");
    expect(prompt).toContain("Kolby Kappes");
    expect(prompt.length).toBeGreaterThan(text.length); // prompt wraps content
  });
});
