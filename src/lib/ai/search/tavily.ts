import type { Dataset } from "@/lib/domain/schema";
import type { EvidenceSearchAdapter, SearchHit } from "@/lib/ai/evidence-agent";

const ENDPOINT = "https://api.tavily.com/search";
const TIMEOUT_MS = 15_000;
const MAX_RESULTS = 8;

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
  published_date?: string;
}

/**
 * Tavily-backed external evidence search. Configured only when
 * `TAVILY_API_KEY` is set — free tier, no other paid dependency.
 * Results are cached per policy for the life of the server process.
 */
export class TavilySearchAdapter implements EvidenceSearchAdapter {
  private cache = new Map<string, SearchHit[]>();

  constructor(private readonly apiKey = process.env.TAVILY_API_KEY) {}

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async search(policyId: string, dataset: Dataset): Promise<SearchHit[]> {
    const policy = dataset.policies.find((p) => p.id === policyId);
    if (!policy || !this.apiKey) return [];
    const cached = this.cache.get(policyId);
    if (cached) return cached;

    const jurisdiction = dataset.jurisdictions.find(
      (j) => j.id === policy.jurisdiction_id,
    );
    const queries = [
      `"${policy.name}" evaluation OR impact OR assessment`,
      `"${policy.name}" ${jurisdiction?.name ?? policy.country_code} statistics OR uptake OR results`,
    ];

    const hits = new Map<string, SearchHit>();
    for (const query of queries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: this.apiKey,
            query,
            search_depth: "advanced",
            max_results: MAX_RESULTS,
            include_answer: false,
            include_raw_content: false,
          }),
        });
        if (!res.ok) continue;
        const json = (await res.json()) as { results?: TavilyResult[] };
        for (const r of json.results ?? []) {
          if (!r.url || !r.title) continue;
          if (hits.has(r.url)) continue;
          hits.set(r.url, {
            title: r.title,
            url: r.url,
            snippet: r.content ?? "",
            score: r.score ?? 0,
            published_date: r.published_date,
          });
        }
      } catch {
        // timeout/network — return whatever the other query produced
      } finally {
        clearTimeout(timer);
      }
    }

    const out = [...hits.values()].sort((a, b) => b.score - a.score);
    this.cache.set(policyId, out);
    return out;
  }
}
