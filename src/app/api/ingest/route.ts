import { NextResponse } from "next/server";
import { z } from "zod";

import { loadDataset } from "@/lib/data";
import { getProvider } from "@/lib/ai/provider";
import { createJob, ingestJobs, ingestSourceTexts } from "@/lib/ingest/jobs";
import { runPipeline } from "@/lib/ingest/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const JsonBody = z.object({
  kind: z.enum(["URL", "TEXT"]),
  url: z.string().url().optional(),
  text: z.string().max(200_000).optional(),
  label: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  let kind: "URL" | "PDF" | "TEXT";
  let url: string | undefined;
  let text: string | undefined;
  let pdf: Uint8Array | undefined;
  let label = "source";

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!form || !(file instanceof File)) {
      return NextResponse.json({ error: "PDF file required" }, { status: 400 });
    }
    kind = "PDF";
    const lbl = form.get("label");
    label = typeof lbl === "string" && lbl ? lbl : file.name;
    pdf = new Uint8Array(await file.arrayBuffer());
  } else {
    const parsed = JsonBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid request" }, { status: 400 });
    }
    kind = parsed.data.kind;
    url = parsed.data.url;
    text = parsed.data.text;
    label = parsed.data.label ?? (kind === "URL" ? url ?? "url" : "pasted text");
    if (kind === "URL" && !url)
      return NextResponse.json({ error: "url required" }, { status: 400 });
    if (kind === "TEXT" && !text?.trim())
      return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const job = createJob({ kind, label });
  const dataset = await loadDataset();

  try {
    const result = await runPipeline(
      { kind, url, text, pdf, label },
      dataset,
      getProvider(),
      (stage) => {
        const j = ingestJobs().get(job.id);
        if (j && !j.stagesDone.includes(stage)) j.stagesDone.push(stage);
      },
    );
    ingestSourceTexts().set(job.id, {
      text: result.text,
      url: url ?? null,
      kind,
    });
    job.status = result.status;
    job.draft = result.draft;
    job.stagesDone = [...result.stagesDone];
  } catch (err) {
    job.status = "ERROR";
    job.error = err instanceof Error ? err.message : String(err);
  }
  return NextResponse.json({ id: job.id, status: job.status });
}
