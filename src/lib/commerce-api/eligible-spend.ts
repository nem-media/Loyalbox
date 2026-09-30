import { EARNING_STATES, refunderingsTotaler } from "./contract";
import type { CommerceOrder } from "./types";

/**
 * ELIGIBLE SPEND — ÉT STED I HELE LOYALSUM.
 *
 * Kontrakten definerer det (docs/commerce-api-contract.md, "Eligible spend —
 * LoyalSum V1-standarden"):
 *
 *   varer efter rabat inkl. moms          items_total_ex_tax + items_tax
 *   − refunderede varer inkl. moms        Σ refunds[].line_items[].(total_ex_tax + total_tax)
 *   − ikke-allokerede refunderinger       Σ refunds[].(total_incl_tax − varer − fragt − gebyrer)
 *   (aldrig under 0)
 *
 * og kun, hvis `payment_status` er `paid` eller `partially_refunded`.
 *
 * DET, DER ALDRIG TÆLLER: fragt, fragtmoms og gebyrer — heller ikke når de
 * refunderes. En LoyalSum-belønning er allerede trukket fra i linjernes
 * `discount_ex_tax`, så kunden optjener ikke på den del, belønningen dækkede.
 *
 * `order_status` bruges IKKE. `open` + `paid` er den normale betalte ordre og
 * kvalificerer; `cancelled` + `paid` (betalt, ikke refunderet) gør også.
 *
 * REFUNDERINGER STÅR KUN I `refunds[]`, og hver tælles én gang. Ordren sendes
 * med alle sine refunderinger hver gang, så to synkroniseringer af samme
 * tilstand giver samme tal — og to refunderinger efter hinanden summeres.
 *
 * Regnet i BigInt: et beløb er et heltal i mindste enhed op til 2^53 − 1, og en
 * sum over 500 linjer må ikke miste præcision. Svaret er et almindeligt tal,
 * fordi det aldrig kan overstige varernes eget beløb.
 */
export interface EligibleSpend {
  /** Kvalificerer `payment_status` overhovedet til købsoptjening? */
  earning_qualified: boolean;
  /** Grundlaget i ordrens valutas mindste enhed. 0, hvis ikke kvalificeret. */
  eligible_spend_minor: number;
}

export function beregnEligibleSpend(o: CommerceOrder): EligibleSpend {
  const rt = refunderingsTotaler(o);
  const varer = BigInt(o.amounts.items_total_ex_tax) + BigInt(o.amounts.items_tax);
  let rest = varer - rt.items_ex_tax - rt.items_tax - rt.unallocated;
  if (rest < BigInt(0)) rest = BigInt(0);
  const earning_qualified = EARNING_STATES.has(o.payment_status);
  return {
    earning_qualified,
    eligible_spend_minor: earning_qualified ? Number(rest) : 0,
  };
}
