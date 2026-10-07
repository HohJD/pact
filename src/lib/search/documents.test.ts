import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { searchDocuments, storeDocument } from "./documents";

const documentGlobals = globalThis as typeof globalThis & {
  __pactPolicyDocuments?: unknown;
  __pactPolicyDocumentsIndex?: unknown;
};

describe("seed-mode source document search", () => {
  beforeEach(() => {
    delete documentGlobals.__pactPolicyDocuments;
    delete documentGlobals.__pactPolicyDocumentsIndex;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("finds deep document text and returns a bounded snippet", async () => {
    vi.stubEnv("PACT_DATA_SOURCE", "seed");
    const keyword = "thermoharvesting";
    const text = `Opening paragraph. ${"routine source wording ".repeat(35)}${keyword} ${"closing detail ".repeat(35)}`;

    await storeDocument({
      policy_id: "pol_gb_bus",
      label: "Long source text",
      url: null,
      kind: "TEXT",
      text,
    });

    const [hit] = await searchDocuments(keyword);
    expect(hit?.snippet).toContain(keyword);
    expect(hit?.snippet.length).toBeLessThanOrEqual(260);
  });

  it("finds a fuzzy typo in source text", async () => {
    vi.stubEnv("PACT_DATA_SOURCE", "seed");
    await storeDocument({
      policy_id: "pol_gb_bus",
      label: "Fuzzy source",
      url: null,
      kind: "TEXT",
      text: "A separate source discusses thermoharvesting in detail.",
    });

    expect(await searchDocuments("thermoharvestin")).toHaveLength(1);
  });

  it("returns no documents for unrelated or empty queries", async () => {
    vi.stubEnv("PACT_DATA_SOURCE", "seed");
    await storeDocument({
      policy_id: "pol_gb_bus",
      label: "Unrelated source",
      url: null,
      kind: "TEXT",
      text: "A source about residential insulation.",
    });

    expect(await searchDocuments("quartzmeteorology")).toEqual([]);
    expect(await searchDocuments("")).toEqual([]);
  });
});
