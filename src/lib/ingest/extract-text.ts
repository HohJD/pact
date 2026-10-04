/** Text extraction for the three ingest input modes. */

function stripHtml(html: string): string {
  // prefer <main>/<article> content when present
  const preferred =
    /<main[\s\S]*?<\/main>/i.exec(html)?.[0] ??
    /<article[\s\S]*?<\/article>/i.exec(html)?.[0] ??
    html;
  return preferred
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(p|div|section|h[1-6]|li|tr)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractFromUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "PACT-ingest/0.1" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`fetch ${res.status} ${res.statusText}`);
  const html = await res.text();
  const text = stripHtml(html);
  if (text.length < 40) throw new Error("page produced almost no text");
  return text;
}

export async function extractFromPdf(bytes: Uint8Array): Promise<string> {
  const { extractText } = await import("unpdf");
  const result = await extractText(new Uint8Array(bytes));
  const pages: string[] = Array.isArray(result.text) ? result.text : [String(result.text)];
  return pages.join("\n\n").trim();
}

export function extractFromText(text: string): string {
  return text.trim();
}
