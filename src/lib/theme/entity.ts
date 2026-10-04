export const ENTITY_KINDS = [
  "policy",
  "jurisdiction",
  "mechanism",
  "technology",
  "evidence",
  "outcome",
] as const

export type EntityKind = (typeof ENTITY_KINDS)[number]

export const ENTITY_COLORS: Record<EntityKind, string> = {
  policy: "#4C8DFF",
  jurisdiction: "#9B7BFF",
  mechanism: "#FF9A3D",
  technology: "#2FD3E6",
  evidence: "#F2C94C",
  outcome: "#3DDC97",
}

export function isEntityKind(kind: string): kind is EntityKind {
  return (ENTITY_KINDS as readonly string[]).includes(kind)
}

/** Tailwind class fragment for an entity accent, e.g. `entityClass("policy", "bg")` -> "bg-entity-policy". */
export function entityClass(
  kind: EntityKind,
  prefix: "bg" | "text" | "border" | "fill" | "stroke" = "bg",
): string {
  return `${prefix}-entity-${kind}`
}
