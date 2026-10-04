"use client";

import { useEffect, useRef, useState } from "react";

export interface XY {
  x: number;
  y: number;
}

const DURATION = 450;

/**
 * Tweens node positions toward new targets over ~450ms with ease-out cubic.
 * Returns a live Map of positions (recreated each animation frame).
 */
export function useAnimatedPositions(targets: Map<string, XY>) {
  const [positions, setPositions] = useState<Map<string, XY>>(() => new Map(targets));
  // Mirror of the latest emitted positions, readable inside effects.
  const currentRef = useRef<Map<string, XY>>(new Map(targets));

  useEffect(() => {
    const from = currentRef.current;
    const start = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const e = 1 - Math.pow(1 - t, 3);
      const next = new Map<string, XY>();
      for (const [id, target] of targets) {
        const f = from.get(id) ?? target;
        next.set(id, {
          x: f.x + (target.x - f.x) * e,
          y: f.y + (target.y - f.y) * e,
        });
      }
      currentRef.current = next;
      setPositions(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [targets]);

  return positions;
}
