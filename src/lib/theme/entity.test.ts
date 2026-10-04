import { describe, expect, it } from "vitest"

import {
  ENTITY_COLORS,
  ENTITY_KINDS,
  entityClass,
  isEntityKind,
} from "./entity"

describe("entity theme", () => {
  it("has a color for every entity kind", () => {
    for (const kind of ENTITY_KINDS) {
      expect(ENTITY_COLORS[kind]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it("builds tailwind class names", () => {
    expect(entityClass("policy")).toBe("bg-entity-policy")
    expect(entityClass("outcome", "text")).toBe("text-entity-outcome")
    expect(entityClass("mechanism", "border")).toBe("border-entity-mechanism")
  })

  it("guards entity kinds", () => {
    expect(isEntityKind("policy")).toBe(true)
    expect(isEntityKind("nonsense")).toBe(false)
  })
})
