import { sha256ArrayBuffer, sha256Text } from "./jobs";

export interface ExtractedSource {
  text: string;
  hash: string;
  fileName: string;
}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

let pdfModulePromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function loadPdfModule(): Promise<typeof import("pdfjs-dist")> {
  if (!pdfModulePromise) {
    pdfModulePromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url")
    ]).then(([pdfjs, workerModule]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
      return pdfjs;
    }).catch((error) => {
      pdfModulePromise = null;
      throw error;
    });
  }
  return pdfModulePromise;
}

export async function extractSourceFromFile(file: File): Promise<ExtractedSource> {
  if (file.size > 18 * 1024 * 1024) {
    throw new Error("The file is larger than 18 MB. Please upload a smaller PDF or TXT file.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const buffer = await file.arrayBuffer();
  const hash = await sha256ArrayBuffer(buffer);

  if (extension === "txt" || file.type === "text/plain") {
    const text = normalizeExtractedText(new TextDecoder().decode(buffer));
    if (!text) throw new Error("The text file is empty.");
    return { text, hash, fileName: file.name };
  }

  if (extension !== "pdf" && file.type !== "application/pdf") {
    throw new Error("ReqRadar currently supports PDF and TXT files.");
  }

  // PDF.js is intentionally loaded only when a PDF is selected. This keeps the
  // initial GitHub Pages bundle small and prevents a PDF runtime issue from
  // blocking the rest of ReqRadar from starting.
  const { getDocument } = await loadPdfModule();
  const loadingTask = getDocument({ data: new Uint8Array(buffer) });
  const document = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    let pageText = "";

    for (const item of content.items) {
      if (!("str" in item)) continue;
      pageText += item.str;
      pageText += item.hasEOL ? "\n" : " ";
    }

    pages.push(pageText);
  }

  const text = normalizeExtractedText(pages.join("\n\n"));
  if (!text) {
    throw new Error(
      "No selectable text was found. This version does not include OCR for scanned PDFs."
    );
  }

  return { text, hash, fileName: file.name };
}

export async function extractSourceFromText(text: string): Promise<ExtractedSource> {
  const normalized = normalizeExtractedText(text);
  if (normalized.length < 40) {
    throw new Error("Paste at least 40 characters from the job posting.");
  }
  return {
    text: normalized,
    hash: await sha256Text(normalized),
    fileName: "Pasted job description"
  };
}
