const DEFAULT_SIZE = 1200;
const DEFAULT_OVERLAP = 150;

/**
 * Chunk text into ~size-character windows with `overlap` characters shared
 * between consecutive chunks. Splits prefer sentence boundaries (". ", "! ",
 * "? ", newline) so quotes stay readable for provenance.
 */
export function chunkText(
  text: string,
  size = DEFAULT_SIZE,
  overlap = DEFAULT_OVERLAP,
): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (clean.length <= size) return clean ? [clean] : [];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      // walk back to a sentence boundary within the last ~40% of the window
      const windowText = clean.slice(start, end);
      const boundary = Math.max(
        windowText.lastIndexOf(". "),
        windowText.lastIndexOf(".\n"),
        windowText.lastIndexOf("! "),
        windowText.lastIndexOf("? "),
        windowText.lastIndexOf("\n\n"),
      );
      if (boundary > size * 0.6) end = start + boundary + 1;
    }
    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}
