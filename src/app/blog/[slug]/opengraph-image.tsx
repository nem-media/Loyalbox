import { ImageResponse } from "next/og";
import { getPost, POSTS } from "@/lib/blog";
import { OG_STOERRELSE, OG_TYPE, ogKort, ogSkrifter } from "@/lib/og-kort";

/**
 * DELEBILLEDE PR. ARTIKEL.
 *
 * Artiklerne pegede på deres egen illustration (`/blog/nfc-tag.svg`) og
 * oplyste den som 1200 × 630, hvilket var et gæt og ikke filens mål. Værre:
 * SVG gengives ikke af Facebook, LinkedIn eller Slack. Illustrationerne
 * bliver stående PÅ siden; det er kun det sociale kort, der laves om.
 *
 * Overskriften er artiklens egen — et kort med emnet er dét, der afgør, om
 * nogen klikker, og der lægges ingen påstand oveni.
 */

export const alt = "LoyalSum";
export const size = OG_STOERRELSE;
export const contentType = OG_TYPE;

/**
 * Ét billede pr. artikel ved byggetiden. Uden den her tegnes kortet først ved
 * første besøg — og det første besøg er tit Facebooks robot, der ikke venter.
 */
export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export default async function Image({
  params,
}: {
  // `params` er en Promise her ligesom på siderne. Blev den læst synkront,
  // fandt opslaget ingen artikel, og hvert eneste kort kom ud med
  // reservenavnet "LoyalSum" — set ske, og det kan kun opdages på billedet.
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  return new ImageResponse(
    ogKort({ overskrift: post?.title ?? "LoyalSum" }),
    { ...size, fonts: await ogSkrifter() },
  );
}
