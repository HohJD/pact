import { NextResponse } from "next/server";

import { searchDocuments } from "@/lib/search/documents";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 200) ?? "";
  if (q.length < 3) return NextResponse.json({ documents: [] });
  return NextResponse.json({ documents: await searchDocuments(q, 8) });
}
