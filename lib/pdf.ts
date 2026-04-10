import pdfParse from "pdf-parse";

export async function extractPdfText(fileBuffer: Buffer): Promise<string> {
  const parsed = await pdfParse(fileBuffer);
  return parsed.text ?? "";
}
