import { z } from "zod";

import {
  Confidence,
  CountryCode,
  MechanismKind,
  PolicyStatus,
  RelationType,
} from "@/lib/domain/schema";

const Provenance = z.object({
  chunk_index: z.number().int().default(0),
  quote: z.string().max(400).default(""),
});
export type Provenance = z.infer<typeof Provenance>;

/** An extracted field: the value plus the quote that supports it. */
const field = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ value: value.nullable().default(null), provenance: Provenance.nullable().default(null) });

/**
 * The 17 fields from the product spec, each carrying provenance so a human
 * reviewer can verify every claim against the source text.
 */
export const ExtractedPolicy = z.object({
  policy_name: field(z.string()),
  jurisdiction: field(z.string()),
  country: field(CountryCode),
  description: field(z.string()),
  sector: field(z.string()),
  technologies: field(z.array(z.string())),
  mechanisms: field(z.array(MechanismKind)),
  target_groups: field(z.array(z.string())),
  eligibility: field(z.string()),
  incentives: field(z.string()),
  introduced_date: field(z.string()),
  status: field(PolicyStatus),
  funding: field(z.string()),
  policy_objectives: field(z.array(z.string())),
  source: field(z.string()),
  confidence: field(Confidence),
});
export type ExtractedPolicyT = z.infer<typeof ExtractedPolicy>;

export const PolicyChunkExtraction = z.object({
  policies: z.array(ExtractedPolicy).default([]),
});

export const ExtractedEntities = z.object({
  technologies: z.array(z.string()).default([]),
  mechanisms: z.array(z.string()).default([]),
  jurisdictions: z.array(z.string()).default([]),
  metrics: z.array(z.string()).default([]),
});
export type ExtractedEntitiesT = z.infer<typeof ExtractedEntities>;

export const ExtractedRelations = z.object({
  relations: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        type: RelationType,
        quote: z.string().max(400).default(""),
      }),
    )
    .default([]),
});
export type ExtractedRelationsT = z.infer<typeof ExtractedRelations>;
