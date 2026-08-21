import { describe, it, expect } from "vitest";
import { laesBetalingssvar } from "./betalingssvar";

/**
 * Fejlen den forhindrer stod foran en rigtig kunde: "Unexpected end of JSON
 * input". Det er ikke en fejlbesked, men en implementeringsdetalje fra en
 * JSON-parser — kunden kan ikke handle på den, og vi kan ikke se af den, hvad
 * der gik galt.
 */
function svar(krop: string, status = 200): Response {
  return new Response(krop, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("læsning af betalingssvaret", () => {
  it("giver adressen videre, når alt er godt", async () => {
    const r = await laesBetalingssvar(
      svar(JSON.stringify({ url: "https://checkout.stripe.com/abc" })),
    );
    expect(r.url).toBe("https://checkout.stripe.com/abc");
    expect(r.fejl).toBeUndefined();
  });

  it("kaster ALDRIG på en tom krop", async () => {
    // Det var præcis det, der skete: 500 uden indhold.
    const r = await laesBetalingssvar(svar("", 500));
    expect(r.url).toBeUndefined();
    expect(r.fejl).toContain("Betalingen kunne ikke startes");
  });

  it("kaster aldrig på en HTML-side", async () => {
    // En proxy eller en fejlside svarer med HTML, ikke JSON.
    const r = await laesBetalingssvar(
      new Response("<!doctype html><h1>502</h1>", { status: 502 }),
    );
    expect(r.fejl).toBeTruthy();
  });

  it("bruger rutens egen besked, når der er en", async () => {
    const r = await laesBetalingssvar(
      svar(JSON.stringify({ error: "Vi mangler dit CVR-nummer." }), 400),
    );
    expect(r.fejl).toBe("Vi mangler dit CVR-nummer.");
  });

  it("stoler ikke på en 200 uden adresse", async () => {
    // En tom 200 er ikke en succes. Uden dette ville browseren blive sendt
    // til "undefined".
    for (const krop of ["{}", JSON.stringify({ url: "" }), JSON.stringify({ url: 42 })]) {
      const r = await laesBetalingssvar(svar(krop));
      expect(r.url, krop).toBeUndefined();
      expect(r.fejl, krop).toBeTruthy();
    }
  });

  it("stoler ikke på en adresse i et fejlsvar", async () => {
    const r = await laesBetalingssvar(
      svar(JSON.stringify({ url: "https://ondt.example" }), 500),
    );
    expect(r.url).toBeUndefined();
  });
});
