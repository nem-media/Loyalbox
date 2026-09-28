import { KATALOG, SITE_NAME } from "@/lib/constants";
import { shoppableProducts, toGoogleShoppingItem } from "@/lib/commerce";
import { getSiteUrl } from "@/lib/site";

/**
 * GOOGLE MERCHANT CENTER-FEEDET.
 *
 * Merchant Center henter denne adresse selv hver dag (en planlagt hentning),
 * så pris, billede og lagerstatus altid er katalogets — en vare tastet ind i
 * hånden i Merchant Center ville stille komme i utakt den dag, prisen ændres.
 *
 * KUN `shoppable`-VARER, og i dag er det kun Reviewstander: den er den eneste
 * fysiske vare med en fast pris. Abonnementerne hører ikke hjemme i Shopping,
 * og en vare uden et rigtigt foto holdes ude af `toGoogleShoppingItem()`.
 *
 * RSS 2.0 med Googles `g:`-navnerum — det format, Merchant Center læser
 * direkte. Statisk: feedet ændrer sig kun med en udrulning.
 */
export const dynamic = "force-static";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function felt(navn: string, vaerdi: string | number | undefined | null): string {
  if (vaerdi === undefined || vaerdi === null || vaerdi === "") return "";
  return `      <g:${navn}>${esc(String(vaerdi))}</g:${navn}>\n`;
}

export function GET() {
  const base = getSiteUrl();
  const varer = shoppableProducts(KATALOG)
    .map(toGoogleShoppingItem)
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const items = varer
    .map((v) => {
      const ekstra = v.additional_image_link
        .map((u) => felt("additional_image_link", u))
        .join("");
      return (
        "    <item>\n" +
        felt("id", v.id) +
        `      <title>${esc(v.title)}</title>\n` +
        `      <description>${esc(v.description)}</description>\n` +
        `      <link>${esc(v.link)}</link>\n` +
        felt("image_link", v.image_link) +
        ekstra +
        felt("availability", v.availability) +
        felt("price", v.price) +
        felt("brand", v.brand) +
        felt("condition", v.condition) +
        felt("google_product_category", v.google_product_category) +
        felt("product_type", v.product_type) +
        felt("gtin", v.gtin) +
        felt("mpn", v.mpn) +
        felt("identifier_exists", v.identifier_exists) +
        "      <g:shipping>\n" +
        `        <g:country>${v.shipping.country}</g:country>\n` +
        `        <g:service>${v.shipping.service}</g:service>\n` +
        `        <g:price>${v.shipping.price}</g:price>\n` +
        `        <g:min_transit_time>${v.shipping.min_transit_time}</g:min_transit_time>\n` +
        `        <g:max_transit_time>${v.shipping.max_transit_time}</g:max_transit_time>\n` +
        "      </g:shipping>\n" +
        "    </item>\n"
      );
    })
    .join("");

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n' +
    "  <channel>\n" +
    `    <title>${esc(SITE_NAME)}</title>\n` +
    `    <link>${esc(base)}</link>\n` +
    `    <description>${esc(SITE_NAME)} — produkter til Google Shopping</description>\n` +
    items +
    "  </channel>\n" +
    "</rss>\n";

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
