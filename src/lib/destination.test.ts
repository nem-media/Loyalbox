import { describe, it, expect } from "vitest";
import { kraeverDestination } from "./commerce";
import { getProduct } from "./constants";

/**
 * Hvornår SKAL bestillingen oplyse, hvad skiltet peger på?
 *
 * REGLEN: et fysisk skilt uden abonnement har en trykt QR og ingen dynamiske
 * links. Destinationen er afgjort én gang for alle i det øjeblik, skiltet går
 * i trykken. Spørger vi ikke ved bestillingen, findes svaret aldrig — og
 * kunden står med et skilt, der fører ingen steder hen, og som kun kan rettes
 * med et nyt tryk.
 *
 * Testene her findes, fordi fejlen er DYR og TAVS. Glemmer nogen at kræve
 * feltet, sker der intet ved bestillingen, intet ved betalingen og intet i
 * admin. Det opdages, når skiltet står på en disk.
 *
 * Både formularen og `/api/checkout` spørger denne ene funktion, så feltet
 * ikke kan blive vist uden at blive krævet, eller omvendt.
 */

const reviewstander = getProduct("reviewstander"); // engangspris
const pro = getProduct("reviewstander-pro"); // abonnement
const komplet = getProduct("loyalsum-komplet"); // abonnement
const ekstra = getProduct("ekstra-stander"); // tilkøb, ingen månedspris

describe("kraeverDestination", () => {
  it("KRÆVER link ved engangskøb af en reviewstander", () => {
    expect(kraeverDestination(reviewstander, { plan: "basic" })).toBe(true);
  });

  it("kræver IKKE link, når købet selv har et abonnement", () => {
    // Køber man Pro eller Komplet, kan destinationen sættes bagefter i
    // dashboardet — at kræve den her ville være at bede om noget, kunden
    // kan ændre fem minutter senere.
    expect(kraeverDestination(pro, { plan: "basic" })).toBe(false);
    expect(kraeverDestination(komplet, { plan: "basic" })).toBe(false);
  });

  /**
   * DEN, DER ER NEM AT TAGE FEJL AF.
   *
   * "Ekstra stander" har ingen månedspris, men køberen kan sagtens være
   * Pro-kunde i forvejen. Så kan de skifte destinationen når som helst, og
   * feltet ville være ren friktion.
   */
  it("ser på kundens BESTÅENDE forhold, ikke kun på varen", () => {
    expect(kraeverDestination(ekstra, { plan: "pro" })).toBe(false);
    expect(kraeverDestination(ekstra, { plan: "basic" })).toBe(true);
  });

  it("kræver link af Premium — de har ikke dynamiske links", () => {
    // Premium er et abonnement, men uden `dynamicLinks`. Det er derfor
    // reglen spørger om CAPABILITY og ikke om, hvorvidt der betales månedligt.
    expect(kraeverDestination(ekstra, { plan: "premium" })).toBe(true);
  });

  it("kræver intet af en vare uden fysisk skilt", () => {
    expect(kraeverDestination(undefined, { plan: "basic" })).toBe(false);
  });

  it("behandler en manglende virksomhed som basic", () => {
    // Uden virksomhed når man alligevel ikke til betaling — men reglen må
    // ikke falde tilbage til det mildeste svar, hvis nogen kalder den.
    expect(kraeverDestination(reviewstander, null)).toBe(true);
    expect(kraeverDestination(reviewstander, { plan: null })).toBe(true);
  });
});
