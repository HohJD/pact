import type { ReactNode } from "react";

/**
 * Minimal inline markup for analyst/model text — no markdown library:
 * `**bold**` → <strong>, `\n` → line break, a line starting with `- ` →
 * a bullet line. Text without markup passes through unchanged.
 */
export function renderInline(text: string): ReactNode[] {
  if (!/[\n*]/.test(text) && !text.startsWith("- ")) return [text];
  const out: ReactNode[] = [];
  let key = 0;
  text.split("\n").forEach((line, li) => {
    if (li > 0) out.push(<br key={`br${key++}`} />);
    const bullet = line.startsWith("- ");
    const body = bullet ? line.slice(2) : line;
    if (bullet) out.push("• ");
    body.split(/\*\*([^*]+)\*\*/g).forEach((seg, si) => {
      if (!seg) return;
      out.push(
        si % 2 === 1 ? (
          <strong key={`s${key++}`}>{seg}</strong>
        ) : (
          seg
        ),
      );
    });
  });
  return out;
}
