import { z } from "zod";
import { NextResponse } from "next/server";

import { getRepository } from "@/lib/data";
import { getProvider } from "@/lib/ai/provider";
import { assessTransfer } from "@/lib/ai/transfer";
import { CountryCode } from "@/lib/domain/schema";

export const runtime = "nodejs";

const Body = z.object({
  target_jurisdiction_id: z.string().min(1),
  source_policy_ids: z.array(z.string()).optional(),
  source_country: CountryCode.optional(),
  question: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const dataset = getRepository().getDataset();
  const result = await assessTransfer(parsed.data, dataset, getProvider());
  return NextResponse.json(result);
}
