import { NextResponse } from "next/server";

import { addRuntimeEvidence } from "@/lib/data/runtime";
import { Evidence } from "@/lib/domain/schema";

export const runtime = "nodejs";

/**
 * "Add to workspace" — persist a CANDIDATE evidence record server-side for the
 * life of the process (seed mode). The client also merges it immediately via
 * the workspace store, so no reload is needed.
 */
export async function POST(req: Request) {
  const parsed = Evidence.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid evidence" }, { status: 400 });
  if (parsed.data.data_status !== "CANDIDATE")
    return NextResponse.json(
      { error: "only CANDIDATE evidence can be added this way" },
      { status: 400 },
    );
  addRuntimeEvidence(parsed.data);
  return NextResponse.json({ ok: true });
}
