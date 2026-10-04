import type { AnalystResponse, Claim } from "@/lib/domain/schema";

export type AnswerSegment =
  | { type: "text"; text: string }
  | { type: "cite"; claimIndex: number; numbers: number[] };

export interface RenumberedCitations {
  /** Answer text split into prose and citation-marker segments. */
  answerSegments: AnswerSegment[];
  /** Claims paired with the evidence numbers they cite. */
  claims: { claim: Claim; numbers: number[] }[];
  /** Evidence ids in first-appearance order — index n is citation [n+1]. */
  evidenceOrder: string[];
}

/**
 * Assigns citation numbers by evidence (first appearance across claims), so
 * the same evidence id always carries the same [n] everywhere it is cited.
 * The answer's inline [k] markers are claim-ordered — they are remapped to the
 * evidence numbers of claim k.
 */
export function renumberCitations(
  response: Pick<AnalystResponse, "answer" | "claims">,
): RenumberedCitations {
  const evidenceOrder: string[] = [];
  const numbers = new Map<string, number>();
  const claims = response.claims.map((claim) => {
    const ns = claim.evidence_ids.map((id) => {
      let n = numbers.get(id);
      if (n === undefined) {
        evidenceOrder.push(id);
        n = evidenceOrder.length;
        numbers.set(id, n);
      }
      return n;
    });
    return { claim, numbers: [...new Set(ns)] };
  });

  const answerSegments: AnswerSegment[] = [];
  const parts = response.answer.split(/(\[\d+\])/g);
  for (const part of parts) {
    const m = part.match(/^\[(\d+)\]$/);
    if (!m) {
      if (part) answerSegments.push({ type: "text", text: part });
      continue;
    }
    const claimIndex = parseInt(m[1], 10) - 1;
    const entry = claims[claimIndex];
    answerSegments.push(
      entry
        ? { type: "cite", claimIndex, numbers: entry.numbers }
        : { type: "text", text: part },
    );
  }

  return { answerSegments, claims, evidenceOrder };
}
