export const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;

export function formatFileSizeMB(sizeInBytes: number) {
  const mb = sizeInBytes / (1024 * 1024);
  return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1).replace('.', ',')} MB`;
}
