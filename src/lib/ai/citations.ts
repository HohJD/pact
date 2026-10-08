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
  const parts = response.answer.split(/(\[\d+\]|\s*\([^()]*\))/g);
  for (const part of parts) {
    const ids = idGroup(part);
    if (ids) {
      // live models sometimes cite raw record ids in prose — show the
      // evidence ones as numbered chips, drop the rest
      const remaining = ids.rest.length ? ` (${ids.rest.join(", ")})` : "";
      if (remaining) answerSegments.push({ type: "text", text: remaining });
      const ns = [
        ...new Set(
          ids.ids.map((id) => numbers.get(id)).filter((n): n is number => !!n),
        ),
      ];
      const claimIndex = claims.findIndex((c) =>
        c.numbers.some((n) => ns.includes(n)),
      );
      if (ns.length && claimIndex >= 0)
        answerSegments.push({ type: "cite", claimIndex, numbers: ns });
      continue;
    }
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

const RECORD_ID = /^(pol|ev|out|jur|tech|mech|ts|metric|sim)_[a-z0-9_]+$/;

/**
 * A parenthetical containing record ids, e.g. " (pol_gb_bus)" or
 * " (IRC §25C, pol_us_25c)" — returns the ids and any non-id remainder.
 */
function idGroup(part: string): { ids: string[]; rest: string[] } | null {
  const m = part.match(/^\s*\(([^()]*)\)$/);
  if (!m) return null;
  const tokens = m[1].split(/[,;]\s*/).map((t) => t.trim()).filter(Boolean);
  const ids = tokens.filter((t) => RECORD_ID.test(t));
  if (!ids.length) return null;
  return { ids, rest: tokens.filter((t) => !RECORD_ID.test(t)) };
}

/** Strips raw record-id parentheticals from partially streamed prose. */
export function stripRecordIds(text: string): string {
  return text.replace(/\s*\([^()]*\)/g, (g) => {
    const ids = idGroup(g);
    if (!ids) return g;
    return ids.rest.length ? ` (${ids.rest.join(", ")})` : "";
  });
}
