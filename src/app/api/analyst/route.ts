import { z } from "zod";
import { NextResponse } from "next/server";

import { getRepository } from "@/lib/data";
import { analyse } from "@/lib/ai/analyst";
import { getProvider } from "@/lib/ai/provider";
import { CountryCode } from "@/lib/domain/schema";

export const runtime = "nodejs";

const Body = z.object({
  question: z.string().min(1).max(2000),
  workspace: z
    .object({
      selectedPolicyIds: z.array(z.string()).optional(),
      focusedCountry: CountryCode.nullable().optional(),
      compareIds: z.array(z.string()).optional(),
      filters: z
        .object({
          countries: z.array(CountryCode).optional(),
          technology_ids: z.array(z.string()).optional(),
          mechanism_ids: z.array(z.string()).optional(),
          year_from: z.number().optional(),
          year_to: z.number().optional(),
          status: z
            .enum(["ACTIVE", "CLOSED", "ANNOUNCED", "SUPERSEDED", "PAUSED"])
            .optional(),
          query: z.string().optional(),
          evidence_strength_min: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const dataset = getRepository().getDataset();
  const result = await analyse(
    parsed.data.question,
    dataset,
    parsed.data.workspace,
    getProvider(),
  );
  return NextResponse.json(result);
}
