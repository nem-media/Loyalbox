import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AktiverForm } from "./aktiver-form";
import { AKTIVERING_TEKSTER } from "@/lib/aktivering";

/**
 * Komplet Online har ingen stander, og aktiveringen lovede før én. Prøven
 * tegner selve formularen, så det er teksten kunden SER, der holdes fast.
 */
const tegn = (digital?: boolean) =>
  renderToStaticMarkup(
    createElement(AktiverForm, {
      action: async () => ({}),
      skjultFelt: { navn: "token", vaerdi: "x" },
      digital,
    }),
  );

describe("AktiverForm", () => {
  it("nævner ingen stander for en digital vare", () => {
    const html = tegn(true);
    expect(html).toContain(AKTIVERING_TEKSTER.hjaelpDigital);
    expect(html).not.toMatch(/stander/i);
  });

  it("taler stadig om standeren som standard", () => {
    expect(tegn()).toContain(AKTIVERING_TEKSTER.hjaelp);
  });
});
