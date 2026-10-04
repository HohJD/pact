import { z } from "zod";

import {
  PolicyStatus,
  type CausalStrength,
  type CountryCode,
  type Dataset,
  type Evidence,
  type Jurisdiction,
  type Mechanism,
  type Outcome,
  type Policy,
  type Similarity,
  type Technology,
  type TimeSeries,
} from "@/lib/domain/schema";

export type PolicyStatusT = z.infer<typeof PolicyStatus>;

export interface PolicyFilter {
  countries?: CountryCode[];
  technology_ids?: string[];
  mechanism_ids?: string[];
  year_from?: number;
  year_to?: number;
  min_evidence_strength?: CausalStrength[];
  status?: PolicyStatusT;
  query?: string;
}

export interface SearchResults {
  policies: Policy[];
  evidence: Evidence[];
  jurisdictions: Jurisdiction[];
  technologies: Technology[];
  mechanisms: Mechanism[];
}

export type EvidenceStrengthLabel = "Strong" | "Moderate" | "Limited" | "Insufficient";

export interface EvidenceStrength {
  score: number; // 0–5
  label: EvidenceStrengthLabel;
  summary: string[];
  counts: {
    evaluates: number;
    monitors: number;
    context: number;
    demo: number;
    candidate: number;
  };
}

export interface PactRepository {
  getDataset(): Dataset;
  getPolicy(id: string): Policy | undefined;
  listPolicies(filter?: PolicyFilter): Policy[];
  getEvidenceForPolicy(policyId: string): Evidence[];
  getOutcomesForPolicy(policyId: string): Outcome[];
  getTimeSeries(country: CountryCode, metric?: string): TimeSeries[];
  getSimilar(policyId: string, n?: number): Similarity[];
  searchText(q: string): SearchResults;
  getEvidenceStrength(policyId: string): EvidenceStrength;
}
