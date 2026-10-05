import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAnimatedPositions } from "./use-animated-positions";

describe("useAnimatedPositions", () => {
  it("returns updated targets immediately when animation is disabled", () => {
    const initialTargets = new Map([["node", { x: 10, y: 20 }]]);
    const updatedTargets = new Map([["node", { x: 30, y: 40 }]]);
    const { result, rerender } = renderHook(
      ({ targets }) => useAnimatedPositions(targets, { animate: false }),
      { initialProps: { targets: initialTargets } },
    );

    expect(result.current).toBe(initialTargets);

    rerender({ targets: updatedTargets });

    expect(result.current).toBe(updatedTargets);
  });
});
