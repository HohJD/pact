import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { renderInline } from "./render-inline";

const html = (text: string) =>
  renderToStaticMarkup(<>{renderInline(text)}</>);

describe("renderInline", () => {
  it("renders **text** as <strong>", () => {
    expect(html("a **bold** b")).toBe("a <strong>bold</strong> b");
  });

  it("renders \\n- as a line break plus bullet", () => {
    expect(html("intro\n- one\n- two")).toBe(
      "intro<br/>• one<br/>• two",
    );
  });

  it("treats a leading - as a bullet too", () => {
    expect(html("- first")).toBe("• first");
  });

  it("passes plain text through unchanged", () => {
    expect(html("no markup here")).toBe("no markup here");
  });
});
