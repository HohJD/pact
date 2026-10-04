import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@supabase/supabase-js";

import { invalidateDataset } from "@/lib/data";
import { addRuntimePolicy } from "@/lib/data/runtime";
import { ingestJobs } from "@/lib/ingest/jobs";

export const runtime = "nodejs";

const Body = z.object({ decision: z.enum(["publish", "reject"]) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = ingestJobs().get(id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid request" }, { status: 400 });

  if (parsed.data.decision === "reject") {
    job.status = "REJECTED";
    return NextResponse.json({ id: job.id, status: job.status });
  }

  const policy = job.draft?.policy;
  if (!policy)
    return NextResponse.json(
      { error: "nothing to publish — no drafted policy" },
      { status: 400 },
    );

  if (process.env.PACT_DATA_SOURCE === "supabase") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
      return NextResponse.json(
        { error: "supabase service key not configured" },
        { status: 500 },
      );
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.from("policies").upsert({
      ...policy,
      sources: policy.sources,
    });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // seed mode: in-memory until the server restarts (MVP — see runtime.ts)
    addRuntimePolicy(policy);
    invalidateDataset();
  }

  job.status = "PUBLISHED";
  return NextResponse.json({ id: job.id, status: job.status, policy_id: policy.id });
}
