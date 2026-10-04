import { describe, expect, it } from "vitest";

import { renumberCitations } from "./citations";
import { matchFallback } from "./fallback-content";

const heatPump = matchFallback(
  "Which policies have successfully accelerated heat-pump adoption?",
);

describe("renumberCitations", () => {
  it("numbers evidence by first appearance across claims", () => {
    const r = renumberCitations(heatPump);
    // claim 1 cites 2 evidence ids → [1][2]; claim 2 cites a new one → [3]
    expect(r.claims[0].numbers).toEqual([1, 2]);
    expect(r.claims[1].numbers).toEqual([3]);
  });

  it("never gives the same evidence two numbers", () => {
    const r = renumberCitations(heatPump);
    const flat = r.claims.flatMap((c) => c.numbers);
    // every evidence id appears exactly once in the order list
    expect(new Set(r.evidenceOrder).size).toBe(r.evidenceOrder.length);
    // a shared id (ev_iea_future_hp_2022, cited by claims 1 and 5) keeps [2]
    const sharedIdx = r.evidenceOrder.indexOf("ev_iea_future_hp_2022");
    expect(sharedIdx).toBe(1);
    expect(r.claims[4].numbers).toContain(2);
    expect(Math.max(...flat)).toBe(r.evidenceOrder.length);
  });

  it("remaps claim-ordered [k] markers in the answer to evidence numbers", () => {
    const r = renumberCitations(heatPump);
    const cites = r.answerSegments.filter((s) => s.type === "cite");
    expect(cites.length).toBeGreaterThan(0);
    // [1] in the answer refers to claim 1 → its evidence numbers 1,2
    const first = cites[0];
    if (first.type !== "cite") throw new Error("expected cite");
    expect(first.claimIndex).toBe(0);
    expect(first.numbers).toEqual([1, 2]);
    // [5] → claim 5 → numbers include the shared [2]
    const fifth = cites[4];
    if (fifth.type !== "cite") throw new Error("expected cite");
    expect(fifth.claimIndex).toBe(4);
    expect(fifth.numbers).toContain(2);
  });

  it("passes through markers with no matching claim as text", () => {
    const r = renumberCitations({
      answer: "Text with a stray [9] marker.",
      claims: [],
    });
    expect(r.answerSegments.every((s) => s.type === "text")).toBe(true);
    expect(
      r.answerSegments.map((s) => (s.type === "text" ? s.text : "")).join(""),
    ).toBe("Text with a stray [9] marker.");
  });
});
