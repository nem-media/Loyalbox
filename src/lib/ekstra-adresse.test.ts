import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type Stripe from "stripe";
import {
  findMaanedslinje,
  adresserPaaAbonnementet,
  standerPrisForDesign,
} from "./ekstra-adresse";
import { getProduct } from "./constants";
import { SORT_STANDER_TILLAEG, EGEN_FRONTFARVE_PRIS } from "./stander-tilvalg";

/**
 * EN BUTIK MERE ER EN LINJE MERE — ALDRIG ET ABONNEMENT MERE.
 *
 * En virksomhed bærer ÉT `stripe_subscription_id`. Et abonnement nummer to
 * ville blive usynligt og trække penge i al evighed; præcis dét skete for en
 * rigtig kunde 14. september 2026. Derfor er adresse nummer to ANTALLET på
 * den månedslinje, der allerede kører.
 */

/** Et abonnement med de linjer, prøven har brug for. */
function abonnement(
  linjer: Array<{ id: string; priceId: string; quantity?: number }>,
): Pick<Stripe.Subscription, "items"> {
  return {
    items: {
      data: linjer.map((l) => ({
        id: l.id,
        price: { id: l.priceId },
        quantity: l.quantity ?? 1,
      })),
    },
  } as unknown as Pick<Stripe.Subscription, "items">;
}

/** Månedsprisens id i den tilstand, prøverne kører i (test). */
function maanedsPrisId(slug: string): string {
  const id = getProduct(slug)?.stripe?.test?.monthlyPriceId;
  if (!id) throw new Error(`${slug} mangler et månedspris-id i test`);
  return id;
}

describe("månedslinjen findes på pris-id og ikke på position", () => {
  const komplet = maanedsPrisId("loyalsum-komplet");

  /**
   * RÆKKEFØLGEN I `items` ER STRIPES OG IKKE VORES. Tages "den første
   * linje", bliver en forkert linje ganget op den dag, abonnementet bærer
   * mere end én — og kunden betaler for noget andet end det, de trykkede på.
   */
  it("finder linjen, selv når den ikke står først", () => {
    const sub = abonnement([
      { id: "si_andet", priceId: "price_noget_helt_andet" },
      { id: "si_maaned", priceId: komplet, quantity: 2 },
    ]);
    expect(findMaanedslinje(sub, komplet)?.id).toBe("si_maaned");
  });

  it("svarer null, når linjen slet ikke er der", () => {
    const sub = abonnement([{ id: "si_andet", priceId: "price_andet" }]);
    expect(findMaanedslinje(sub, komplet)).toBeNull();
  });
});

/**
 * KOLONNEN `adresser_tilladt` (0034) ER ET AFTRYK AF STRIPES ANTAL.
 *
 * Den læses ved hver sideindlæsning og må derfor ikke koste et opslag hos
 * Stripe — men et aftryk kan komme i utakt, og så er det dette tal, der
 * gælder. Webhooken bruger funktionen til at rette kolonnen.
 */
describe("antallet af adresser læst af abonnementet", () => {
  const komplet = maanedsPrisId("loyalsum-komplet");
  const pro = maanedsPrisId("reviewstander-pro");

  it("læser antallet på kundens egen månedslinje", () => {
    const sub = abonnement([{ id: "si", priceId: komplet, quantity: 3 }]);
    expect(adresserPaaAbonnementet(sub, "loyalsum-komplet")).toBe(3);
  });

  /**
   * VAREN AFGØR LINJEN. En Pro-kunde og en Komplet-kunde har hver sit
   * pris-id, og slås der op med det forkerte, findes linjen ikke — hvilket
   * er langt bedre end at læse et tal fra en linje, der hører til noget
   * andet.
   */
  it("læser ikke en anden vares linje", () => {
    const sub = abonnement([{ id: "si", priceId: pro, quantity: 4 }]);
    expect(adresserPaaAbonnementet(sub, "loyalsum-komplet")).toBeNull();
    expect(adresserPaaAbonnementet(sub, "reviewstander-pro")).toBe(4);
  });

  /**
   * NULL BETYDER "SPØRG IKKE MIG", og kaldestedet skal lade kolonnen være.
   * Et gæt kunne lukke en adresse, der står ude i en butik — og nul ville
   * være det farligste af alle svar.
   */
  it("svarer null frem for at gætte", () => {
    const sub = abonnement([{ id: "si", priceId: komplet, quantity: 2 }]);
    // Ingen vare, en vare uden månedspris, og en ukendt vare.
    expect(adresserPaaAbonnementet(sub, null)).toBeNull();
    expect(adresserPaaAbonnementet(sub, "reviewstander")).toBeNull();
    expect(adresserPaaAbonnementet(sub, "findes-ikke")).toBeNull();

    // Og en linje, der står på nul, skriver heller ikke noget.
    const tom = abonnement([{ id: "si", priceId: komplet, quantity: 0 }]);
    expect(adresserPaaAbonnementet(tom, "loyalsum-komplet")).toBeNull();
  });
});

/**
 * SKILTET TIL DEN NYE BUTIK PRISSÆTTES AF DESIGNET.
 *
 * Farven er et EMNE og koster pr. stander; frontfarven er en OPSÆTNING i
 * trykket og koster pr. ordre. Er opsætningen betalt på et tidligere køb, er
 * en genbestilling af samme design gratis — det er hele grunden til, at
 * `frontfarve_betalt` sidder på designet og ikke på ordren.
 */
describe("prisen på skiltet til den nye butik", () => {
  const listepris = getProduct("ekstra-stander")!.price;

  it("er listeprisen for en hvid stander uden tilvalg", () => {
    expect(
      standerPrisForDesign({ stander_farve: "hvid", betalFrontfarve: false }),
    ).toBe(listepris);
  });

  it("lægger farvetillægget til en sort stander", () => {
    expect(
      standerPrisForDesign({ stander_farve: "sort", betalFrontfarve: false }),
    ).toBe(listepris + SORT_STANDER_TILLAEG);
  });

  it("opkræver kun frontfarven, når den ikke er betalt før", () => {
    const uden = standerPrisForDesign({
      stander_farve: "hvid",
      betalFrontfarve: false,
    });
    const med = standerPrisForDesign({
      stander_farve: "hvid",
      betalFrontfarve: true,
    });
    expect(med - uden).toBe(EGEN_FRONTFARVE_PRIS);
  });
});

/**
 * MEKANIKKEN PRØVES I KILDEN, og det er ikke dovenskab.
 *
 * Alt det, der kan gå galt her, er RÆKKEFØLGE og KONTROLSTRØM i kode, der
 * taler med både Stripe og Supabase — der er ingen returværdi at se på, kun
 * hvor programmet ender henne. Samme argument som i `webhook-ordrestatus.test.ts`.
 */
describe("købet må ikke kunne bygges om til noget farligt", () => {
  const kilde = (sti: string) => readFileSync(join(process.cwd(), sti), "utf8");
  const lib = kilde("src/lib/ekstra-adresse.ts");
  const handling = kilde("src/app/dashboard/standere/actions.ts");
  const adminHandling = kilde("src/app/admin/actions.ts");

  /**
   * DET FARLIGSTE, DER KAN SKE: at nogen "retter" flowet til at oprette et
   * abonnement. Så ville virksomheden have to, og der er kun ét
   * `stripe_subscription_id` at gemme dem i — det andet ville trække penge
   * uden at kunne ses.
   */
  it("opretter ALDRIG et abonnement mere", () => {
    for (const [navn, s] of [
      ["ekstra-adresse.ts", lib],
      ["standere/actions.ts", handling],
    ] as const) {
      expect(s, navn).not.toContain("subscriptions.create");
      expect(s, navn).not.toContain("checkout.sessions.create");
    }
  });

  /**
   * ÉN FAKTURA OG IKKE TO. Skiltet skal ligge som en ventende fakturalinje,
   * FØR antallet hæves — ellers laver `always_invoice` sin faktura først, og
   * skiltet havner på den næste. Så bliver det to træk på kundens kort for
   * ét køb.
   */
  it("lægger skiltet på, før antallet hæves", () => {
    /*
      MÅLT INDE I KUNDENS EGEN FUNKTION. Admins vej hæver også et antal, og
      den ligger tidligere i filen — uden udsnittet ville prøven måle på den
      forkerte og bestå af tilfældige grunde.
    */
    const i = lib.indexOf("export async function koebEkstraAdresse");
    expect(i).toBeGreaterThan(-1);
    const krop = lib.slice(i);

    const linje = krop.indexOf("invoiceItems.create");
    const antal = krop.indexOf("subscriptionItems.update");
    expect(linje).toBeGreaterThan(-1);
    expect(antal).toBeGreaterThan(-1);
    expect(linje).toBeLessThan(antal);
  });

  /**
   * OG DER SKAL FAKTURERES NU. Stripes standard (`create_prorations`) venter
   * til næste træk — så ville skiltet blive faktureret om op til en måned,
   * længe efter det er sendt.
   */
  it("fakturerer med det samme", () => {
    const i = lib.indexOf("export async function koebEkstraAdresse");
    expect(lib.slice(i)).toContain('proration_behavior: "always_invoice"');
  });

  /** Momsen SKAL sættes på linjen. Uden den skylder vi SKAT 25 % af den. */
  it("sætter moms på skiltets linje", () => {
    expect(lib).toContain("tax_rates: [taxRate]");
  });

  /**
   * `koebSpaerre()` ER DEN ENESTE DØR (se AGENTS.md). Skiltet er den samme
   * vare som i "Mangler du et skilt?", og adgangen til at købe den skal
   * afgøres samme sted — ellers kan denne knap sælge noget, /bestil siger
   * nej til.
   */
  it("spørger den samme købsdør som resten af sitet", () => {
    expect(handling).toContain("koebSpaerre");
    expect(kilde("src/app/dashboard/standere/page.tsx")).toContain(
      "koebSpaerre",
    );
  });

  /**
   * ANTALLET TÆLLES I BASEN, samme grund som i `createStand()`: handlingen
   * kører i mange eksemplarer, og et tal fra en side, der blev hentet før,
   * ville lade to faner købe hver sin adresse.
   */
  it("tæller adresserne i basen", () => {
    expect(handling).toMatch(/count: "exact"/);
    expect(handling).toContain("adresseSpaerre");
  });

  /**
   * PLADSEN RESERVERES FØR DER BETALES. To faner kunne ellers begge komme
   * forbi tællingen og begge trække penge. Den betingede opdatering gør
   * databasen til dommeren — den, der taber, rammer nul rækker.
   */
  it("reserverer pladsen, før kortet trækkes", () => {
    const reservation = handling.indexOf('.eq("adresser_tilladt", foer)');
    const betaling = handling.indexOf("await koebEkstraAdresse(");
    expect(reservation).toBeGreaterThan(-1);
    expect(betaling).toBeGreaterThan(-1);
    expect(reservation).toBeLessThan(betaling);
  });

  /**
   * ER DER PLADS I FORVEJEN, MÅ DER IKKE TRÆKKES PENGE. `adresseSpaerre()`
   * svarer null, når kunden har en adresse til gode — og et gammelt faneblad
   * må ikke kunne tage betaling for noget, de allerede har.
   */
  it("afviser købet, når der er en adresse til gode", () => {
    expect(handling).toContain('spaerre !== "kan-koebes"');
  });

  /**
   * EN KØBT BUTIK MÅ IKKE FORSVINDE VED EN OPGRADERING.
   *
   * Pro → Komplet laver et NYT abonnement hos Stripe. Stod der fast
   * `quantity: 1` på månedslinjen, ville en kunde, der har købt en butik
   * mere, miste den linje i samme sekund de opgraderer — de ville stå med to
   * butikker i drift og betale for én, og webhooken ville bagefter skrive
   * antallet ned efter det nye abonnement. Samme gælder en genoptagelse.
   */
  it("bærer de købte adresser med over i et nyt abonnement", () => {
    expect(kilde("src/app/api/checkout/route.ts")).toContain(
      "quantity: adresserTilladt(company)",
    );
  });

  /**
   * OG BELØBET PÅ ABONNEMENTSSIDEN SKAL VÆRE DÉT, DER TRÆKKES. Månedsprisen
   * er prisen PR. ADRESSE; stod varens pris alene, ville kundens egen side
   * sige 399, mens kontoudskriften sagde 798.
   */
  it("viser det samlede månedsbeløb på abonnementssiden", () => {
    expect(kilde("src/app/dashboard/abonnement/page.tsx")).toContain(
      "nuvaerende.monthlyPrice * antalAdresser",
    );
  });

  /**
   * ACCEPTEN AF BETINGELSERNE SKAL SPØRGES HER.
   *
   * Der er INGEN Stripe-checkout imellem, hvor betingelserne ellers ville
   * blive vist og accepteret — knappen ER betalingen. Det gør denne skærm
   * til den eneste lejlighed, og et køb uden en registreret accept er værre
   * end et besværligt køb.
   *
   * Stemplet skal ligge FØR betalingen: fejler betalingen, har kunden ikke
   * fået noget, og en accept uden køb er harmløs — modsat et køb uden accept.
   */
  it("kræver og gemmer accepten af handelsbetingelserne", () => {
    expect(handling).toContain('formData.get("accepterVilkaar")');
    expect(handling).toContain("terms_version: TERMS_VERSION");
    expect(kilde("src/app/dashboard/standere/tilfoej-butik.tsx")).toContain(
      'name="accepterVilkaar"',
    );

    const stempel = handling.indexOf("terms_version: TERMS_VERSION");
    const betaling = handling.indexOf("await koebEkstraAdresse(");
    expect(stempel).toBeLessThan(betaling);
  });

  /**
   * ORDRENS STATUS SÆTTES HER OG IKKE AF EN WEBHOOK.
   *
   * Der er INGEN checkout-session i dette flow, og altså ingen webhook, der
   * kommer forbi og flytter ordren fra `new`. Blev den stående, ville et
   * betalt skilt aldrig komme i produktion — og ingen ville opdage det,
   * fordi `new` netop betyder "oprettet, aldrig betalt".
   */
  it("markerer ordren betalt med det samme — men kun når den ER betalt", () => {
    expect(handling).toContain("kvittering.betalt");
    expect(handling).toContain("needs_onboarding");
  });

  /**
   * ADMIN SKAL KUNNE DET, "SKRIV TIL OS" LOVER.
   *
   * `adresseSpaerre()` sender en kæde over loftet — og enhver med flere
   * adresser end betalte linjer — hen til en mail. Uden en knap i den anden
   * ende var løftet tomt: admin skulle hæve antallet i Stripes dashboard OG
   * rette kolonnen i Supabase i hånden, og glemmes den ene, driver de to tal
   * fra hinanden. Hele mekanikken hviler på, at de er ens.
   */
  it("giver admin en vej til at sælge en butik mere", () => {
    expect(adminHandling).toContain("saelgAdresseAdmin");
    expect(adminHandling).toContain("tilfoejAdresseAdmin");
    expect(
      kilde("src/app/admin/virksomheder/[id]/page.tsx"),
    ).toContain("SaelgAdresse");
  });

  /**
   * ET ADMIN-KLIK MÅ IKKE TRÆKKE PÅ KUNDENS KORT.
   *
   * Kunden har ringet — de har ikke trykket på noget. Derfor
   * `create_prorations` (beløbet lægges på næste faktura den 20.) og ikke
   * `always_invoice`, som er rigtigt dér, hvor kunden selv trykker.
   */
  it("fakturerer ikke straks, når det er admin der hæver", () => {
    const i = lib.indexOf("export async function tilfoejAdresseAdmin");
    expect(i).toBeGreaterThan(-1);
    const krop = lib.slice(i, i + 1400);
    expect(krop).toContain('proration_behavior: "create_prorations"');
    expect(krop).not.toContain("always_invoice");
  });

  /**
   * KOLONNEN SKRIVES AF STRIPES SVAR OG IKKE AF VORES EGEN OPTÆLLING.
   * `adresser_tilladt` SKAL blive ved at svare til antallet på månedslinjen
   * (se migration 0034) — og det gør den kun, hvis den skrives af det, Stripe
   * faktisk står med bagefter.
   */
  it("skriver antallet fra Stripe og ikke foer + 1", () => {
    const i = adminHandling.indexOf("export async function saelgAdresseAdmin");
    const krop = adminHandling.slice(i, i + 3000);
    expect(krop).toContain("adresser_tilladt: svar.adresserTilladt");
    expect(krop).not.toContain("adresser_tilladt: foer + 1");
  });

  /**
   * BEGGE ADMIN-VEJE SKAL EFTERLADE ET SPOR. Den gratis "Tilføj stander" er
   * dét, der giver en kunde flere adresser end linjer — og uden en linje i
   * loggen kan ingen svare på, hvorfor de så står sådan.
   */
  it("noterer både den solgte og den forærede adresse", () => {
    expect(adminHandling).toContain('handling: "adresse-solgt"');
    expect(adminHandling).toContain('handling: "adresse-givet"');
  });

  /**
   * ADMIN MÅ IKKE VISE VARENS ENHEDSPRIS SOM DET, KUNDEN BETALER.
   *
   * Set på skærmen 15. september med et rigtigt live-abonnement: kortet sagde
   * "LoyalSum Komplet · 399 kr./md", mens "Næste betaling" to linjer nede
   * sagde 798 kr. To tal om det samme, der ikke passer sammen, er værre end
   * ét — og det er præcis samme fejl som på kundens egen abonnementsside.
   */
  it("ganger månedsprisen med antallet af adresser i admin", () => {
    expect(
      kilde("src/app/admin/virksomheder/[id]/abonnement-kort.tsx"),
    ).toContain("enhedspris * adresser");
  });

  /**
   * KVITTERINGEN MÅ IKKE REGNE SIT EGET TAL UD.
   *
   * Den sagde "dækker nu {adresserTilladt + 1}" — men proppen er allerede
   * skrevet om af `revalidatePath`, når beskeden tegnes, så den lagde én til
   * det NYE tal og påstod 3, hvor der stod 2. Set på skærmen 15. september.
   * Linjen "X oprettet · Y betalt" er den ene rigtige kilde.
   */
  it("gentager ikke antallet i kvitteringen efter salget", () => {
    const s = kilde("src/app/admin/virksomheder/[id]/saelg-adresse.tsx");
    const i = s.indexOf("{state.ok ?");
    expect(i).toBeGreaterThan(-1);
    expect(s.slice(i, i + 400)).not.toContain("adresserTilladt + 1");
  });

  /**
   * DER SKAL PAKKES NOGET. Varslet til os selv er den eneste måde, den viden
   * kommer ud af systemet — admin har ingen åben, og der kommer ingen
   * webhook her. Kundens bekræftelse sendes EFTER, så en fejl i den ikke
   * koster os beskeden om, at der er et skilt at sende.
   */
  it("sender varslet til os før bekræftelsen til kunden", () => {
    const vores = handling.indexOf("ordrevarsel(detaljer)");
    const kundens = handling.indexOf("ordrebekraeftelse(detaljer)");
    expect(vores).toBeGreaterThan(-1);
    expect(kundens).toBeGreaterThan(-1);
    expect(vores).toBeLessThan(kundens);
  });
});
