import pdfParse from "pdf-parse";

const TT_WARNING_REGEX = /^Warning:\s*TT:\s*undefined function:\s*\d+/i;
const BUFFER_DEPRECATION_REGEX = /DEP0005|Buffer\(\) is deprecated/i;

function shouldSuppressLog(message: string): boolean {
  const normalized = message.trim();
  return TT_WARNING_REGEX.test(normalized) || BUFFER_DEPRECATION_REGEX.test(normalized);
}

async function withSuppressedPdfFontWarnings<T>(fn: () => Promise<T>): Promise<T> {
  const originalWarn = console.warn;
  const originalLog = console.log;
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalEmitWarning = process.emitWarning.bind(process);

  console.warn = (...args: unknown[]) => {
    const message = args.map((arg) => String(arg)).join(" ");
    if (shouldSuppressLog(message)) {
      return;
    }
    originalWarn(...args);
  };

  console.log = (...args: unknown[]) => {
    const message = args.map((arg) => String(arg)).join(" ");
    if (shouldSuppressLog(message)) {
      return;
    }
    originalLog(...args);
  };

  (process.stderr.write as unknown as (...args: unknown[]) => boolean) = (
    chunk: unknown,
    encoding?: unknown,
    callback?: unknown
  ) => {
    const message =
      typeof chunk === "string"
        ? chunk
        : Buffer.isBuffer(chunk)
          ? chunk.toString("utf8")
          : String(chunk);

    if (shouldSuppressLog(message)) {
      if (typeof encoding === "function") {
        encoding();
      }
      if (typeof callback === "function") {
        callback();
      }
      return true;
    }

    return originalStderrWrite(chunk as never, encoding as never, callback as never);
  };

  (process.stdout.write as unknown as (...args: unknown[]) => boolean) = (
    chunk: unknown,
    encoding?: unknown,
    callback?: unknown
  ) => {
    const message =
      typeof chunk === "string"
        ? chunk
        : Buffer.isBuffer(chunk)
          ? chunk.toString("utf8")
          : String(chunk);

    if (shouldSuppressLog(message)) {
      if (typeof encoding === "function") {
        encoding();
      }
      if (typeof callback === "function") {
        callback();
      }
      return true;
    }

    return originalStdoutWrite(chunk as never, encoding as never, callback as never);
  };

  (process.emitWarning as unknown as (...args: unknown[]) => void) = (...args: unknown[]) => {
    const [warning, type, code] = args;
    const message = [warning, type, code].map((item) => String(item ?? "")).join(" ");
    if (shouldSuppressLog(message)) {
      return;
    }
    originalEmitWarning(warning as never, type as never, code as never);
  };

  try {
    return await fn();
  } finally {
    console.warn = originalWarn;
    console.log = originalLog;
    (process.stderr.write as unknown as (...args: unknown[]) => boolean) = originalStderrWrite as unknown as (
      ...args: unknown[]
    ) => boolean;
    (process.stdout.write as unknown as (...args: unknown[]) => boolean) = originalStdoutWrite as unknown as (
      ...args: unknown[]
    ) => boolean;
    (process.emitWarning as unknown as (...args: unknown[]) => void) = originalEmitWarning as unknown as (
      ...args: unknown[]
    ) => void;
  }
}

export async function extractPdfText(fileBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<string> {
  // pdf-parse is stable in Next.js routes; Buffer() deprecation warnings come from the dependency internals.
  const normalizedBuffer =
    fileBuffer instanceof Buffer
      ? fileBuffer
      : fileBuffer instanceof Uint8Array
        ? Buffer.from(fileBuffer)
        : Buffer.from(new Uint8Array(fileBuffer));

  const parsed = await withSuppressedPdfFontWarnings(() => pdfParse(normalizedBuffer));
  return parsed.text ?? "";
}
