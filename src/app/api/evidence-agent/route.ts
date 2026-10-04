import { z } from "zod";
import { NextResponse } from "next/server";

import { loadDataset } from "@/lib/data";
import { runEvidenceAgent } from "@/lib/ai/evidence-agent";
import { getProvider } from "@/lib/ai/provider";

export const runtime = "nodejs";

const Body = z.object({
  policy_id: z.string().min(1),
  supplied_sources: z
    .array(
      z.object({
        title: z.string(),
        publisher: z.string(),
        text: z.string(),
        url: z.string().url().optional(),
      }),
    )
    .optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const dataset = await loadDataset();
  const result = await runEvidenceAgent(parsed.data, dataset, getProvider());
  return NextResponse.json(result);
}
