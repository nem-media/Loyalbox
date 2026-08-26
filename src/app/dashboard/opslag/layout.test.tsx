import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Spærringen KØRT, ikke bare læst.
 *
 * `komplet-spaerring.test.ts` tjekker, at spærringen findes i kilden. Den her
 * kalder layoutet og ser, hvad det svarer — med præcis de data, testkontiene
 * har i produktionsdatabasen:
 *
 *   basic@loyalbox.test    plan basic  product_slug reviewstander
 *   pro@loyalbox.test      plan pro    product_slug reviewstander-pro
 *   komplet@loyalbox.test  plan pro    product_slug loyalsum-komplet
 *
 * DÉT ER HELE POINTEN MED `pro@`: den har plan `pro`, nøjagtig som Komplet.
 * En spærring skrevet på `plan` ville lukke den ind, og fejlen ville være
 * usynlig — siden ville se helt rigtig ud for en kunde, der ikke havde betalt
 * for den. Derfor spærres der på produktet.
 *
 * Et layout er en async serverkomponent, altså bare en funktion, der giver et
 * React-træ. Der renderes ikke til HTML her; træet gennemløbes for tekst, så
 * prøven ikke afhænger af en DOM eller af, hvordan `next/link` opfører sig
 * uden en router.
 */

const getCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUser() }));

const { default: OpslagLayout } = await import("./layout");

/** Al tekst i et React-træ, fladet ud. */
function tekst(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(tekst).join(" ");
  const el = node as { props?: { children?: unknown } };
  return el.props ? tekst(el.props.children) : "";
}

function virksomhed(over: Record<string, unknown> = {}) {
  return {
    id: "c1",
    name: "Test",
    plan: "pro",
    product_slug: "loyalsum-komplet",
    stripe_status: "active",
    stripe_subscription_id: "sub_1",
    suspenderet_siden: null,
    ...over,
  };
}

beforeEach(() => getCurrentUser.mockReset());

describe("Opslag-spærringen", () => {
  it("lukker Komplet ind — indholdet vises", async () => {
    getCurrentUser.mockResolvedValue({ company: virksomhed() });

    const ud = await OpslagLayout({ children: "SELVE-SIDEN" });
    const t = tekst(ud);

    expect(t).toContain("SELVE-SIDEN");
    expect(t).not.toContain("ikke med i dit abonnement");
  });

  /** Den vigtigste: samme plan som Komplet, andet produkt. */
  it("lukker Reviewstander Pro UDE, selv om planen er pro", async () => {
    getCurrentUser.mockResolvedValue({
      company: virksomhed({ plan: "pro", product_slug: "reviewstander-pro" }),
    });

    const ud = await OpslagLayout({ children: "SELVE-SIDEN" });
    const t = tekst(ud);

    expect(t).not.toContain("SELVE-SIDEN");
    expect(t).toContain("Opslag er ikke med i dit abonnement");
    // Opsalget skal sige HVAD der mangler, ikke bare at noget mangler.
    expect(t).toContain("LoyalSum Komplet");
  });

  it("lukker Basic ude", async () => {
    getCurrentUser.mockResolvedValue({
      company: virksomhed({ plan: "basic", product_slug: "reviewstander" }),
    });

    const ud = await OpslagLayout({ children: "SELVE-SIDEN" });
    expect(tekst(ud)).not.toContain("SELVE-SIDEN");
  });

  /**
   * En suspenderet Komplet-kunde HAR købt funktionen og skal ikke mødes af en
   * reklame for noget, de allerede ejer — men af hvornår de har den tilbage.
   */
  it("viser betalingsbeskeden og ikke opsalget ved suspension", async () => {
    getCurrentUser.mockResolvedValue({
      company: virksomhed({
        stripe_status: "past_due",
        suspenderet_siden: "2026-08-01T00:00:00Z",
      }),
    });

    const ud = await OpslagLayout({ children: "SELVE-SIDEN" });
    const t = tekst(ud);

    expect(t).not.toContain("SELVE-SIDEN");
    expect(t).toContain("betalingen mangler");
    expect(t).not.toContain("ikke med i dit abonnement");
  });

  it("lukker ikke en bruger uden virksomhed ind", async () => {
    getCurrentUser.mockResolvedValue({ company: null });

    const ud = await OpslagLayout({ children: "SELVE-SIDEN" });
    expect(tekst(ud)).not.toContain("SELVE-SIDEN");
  });
});
