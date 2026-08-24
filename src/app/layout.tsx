import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SEO_KEYWORDS } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site";
import { PwaRegister } from "@/components/pwa-register";
import { Analytics } from "@/components/analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_TITLE = "LoyalSum — Få flere kunder og få dem til at komme igen";
const SITE_DESCRIPTION =
  "LoyalSum samler anmeldelser, loyalitet, feedback og synlighed i én platform. Få flere nye kunder — og giv dem en grund til at komme igen.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "da_DK",
    siteName: SITE_NAME,
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  // Gør "Føj til hjemmeskærm" på iOS til en rigtig app-oplevelse: eget ikon og
  // ingen browserlinje. Android læser det tilsvarende fra manifest.ts.
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#2c324e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="da"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <PwaRegister />
        <Analytics />
      </body>
    </html>
  );
}
