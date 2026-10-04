import { z } from "zod";

import {
  CausalStrength,
  Claim,
  Confidence,
  CountryCode,
  Evidence,
  EvidenceType,
  UIAction,
} from "@/lib/domain/schema";

/** Mirrors the TransferAssessment type in transfer-fallback.ts (minus `source`). */
export const TransferAssessmentSchema = z.object({
  transferability: z.enum(["LOW", "MEDIUM", "HIGH"]),
  rationale: z.string(),
  similarities: z.array(z.string()),
  differences: z.array(z.string()),
  lessons: z.array(Claim),
  evidence_confidence: Confidence,
  caveats: z.array(z.string()),
  actions: z.array(UIAction).default([]),
});
export type TransferAssessmentData = z.infer<typeof TransferAssessmentSchema>;

/** Evidence record extracted from a supplied source document (no id — assigned). */
export const ExtractedEvidence = z.object({
  title: z.string(),
  publisher: z.string(),
  authors: z.array(z.string()).default([]),
  publication_date: z.string().default(""),
  source_url: z.string().nullable().default(null),
  evidence_type: EvidenceType,
  methodology: z.string().default(""),
  geography: z.array(CountryCode).default([]),
  policy_ids: z.array(z.string()).default([]),
  policy_relevance: z.enum(["EVALUATES", "MONITORS", "CONTEXT"]).default("MONITORS"),
  metrics: z.array(z.string()).default([]),
  findings: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  confidence: Confidence.default("LOW"),
  causal_strength: CausalStrength.default("UNKNOWN"),
});
export type ExtractedEvidence = z.infer<typeof ExtractedEvidence>;

export const ExtractedEvidenceList = z.object({
  records: z.array(ExtractedEvidence),
});

export const EvidenceStrengthResult = z.object({
  score: z.number(),
  label: z.enum(["Strong", "Moderate", "Limited", "Insufficient"]),
  summary: z.array(z.string()),
  counts: z.object({
    evaluates: z.number(),
    monitors: z.number(),
    context: z.number(),
    demo: z.number(),
  }),
});

export const EvidenceAgentResult = z.object({
  status: z.enum(["OK", "INSUFFICIENT_EVIDENCE"]),
  policy_id: z.string(),
  existing: z.array(Evidence),
  extracted: z.array(Evidence),
  strength: EvidenceStrengthResult,
  notes: z.array(z.string()),
});
export type EvidenceAgentResult = z.infer<typeof EvidenceAgentResult>;
