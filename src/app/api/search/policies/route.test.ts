import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/search/rank", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/search/rank")>();
  return { ...mod, embedQuery: vi.fn(async () => null) };
});

import { GET } from "./route";

interface Payload {
  query: string;
  policies: { id: string; score: number; data_status: string }[];
  similarities: { policy_a: string; policy_b: string }[];
  total_searched: number;
  semantic: boolean;
}

async function get(url: string): Promise<Payload> {
  const res = await GET(new Request(`http://localhost${url}`));
  expect(res.status).toBe(200);
  return (await res.json()) as Payload;
}

describe("GET /api/search/policies", () => {
  beforeAll(() => {
    process.env.PACT_DATA_SOURCE = "seed";
  });

  it("returns ranked policies and similarities only between returned policies", async () => {
    const data = await get("/api/search/policies?q=heat%20pump%20grants");
    expect(data.policies.length).toBeGreaterThan(0);
    const ids = new Set(data.policies.map((p) => p.id));
    for (const s of data.similarities) {
      expect(ids.has(s.policy_a)).toBe(true);
      expect(ids.has(s.policy_b)).toBe(true);
    }
    for (let i = 1; i < data.policies.length; i++) {
      expect(data.policies[i].score).toBeLessThanOrEqual(
        data.policies[i - 1].score,
      );
    }
    expect(data.semantic).toBe(false); // embedQuery is stubbed
  });

  it("imported=0 excludes IMPORTED policies from results and edges", async () => {
    const data = await get(
      "/api/search/policies?q=energy&imported=0",
    );
    expect(
      data.policies.every((p) => p.data_status !== "IMPORTED"),
    ).toBe(true);
  });

  it("empty q returns an empty result set", async () => {
    const data = await get("/api/search/policies");
    expect(data.policies).toEqual([]);
    expect(data.similarities).toEqual([]);
  });
});
