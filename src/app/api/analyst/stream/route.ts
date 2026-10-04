import { z } from "zod";

import { loadDataset } from "@/lib/data";
import { analyseStreaming, fallbackAnalyse } from "@/lib/ai/analyst";
import { getProvider } from "@/lib/ai/provider";
import { sseFrame } from "@/lib/ai/streaming";
import { CountryCode } from "@/lib/domain/schema";

export const runtime = "nodejs";
export const maxDuration = 90;

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
    return new Response("invalid request", { status: 400 });

  const question = parsed.data.question;
  const workspace = parsed.data.workspace;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sseFrame(event, data)));
      try {
        const dataset = await loadDataset();
        const result = await analyseStreaming(
          question,
          dataset,
          workspace,
          getProvider(),
          (text) => send("delta", { text }),
        );
        send("final", result);
      } catch (err) {
        console.warn(
          `[pact-ai] analyst stream fell back: ${err instanceof Error ? err.name : "unknown"}`,
        );
        send("fallback", fallbackAnalyse(question));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
