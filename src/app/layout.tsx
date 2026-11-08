import type { Metadata, Viewport } from "next";
import { Anek_Malayalam } from "next/font/google";
import localFont from "next/font/local";

import { EVENT_DATES, EVENT_PLACE, SITE_NAME, SITE_URL } from "@/lib/site";

import "./globals.css";

const neoverse = localFont({
  src: [
    {
      path: "./fonts/NeoverseSans-RegularCondensed.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/NeoverseSans-Medium.otf",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-neoverse",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const dhikk = localFont({
  src: [
    {
      path: "./fonts/FKL_Dhikk_Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/FKL_Dhikk_Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/FKL_Dhikk_SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/FKL_Dhikk_Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/FKL_Dhikk_ExtraBlack.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-dhikk",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const anekMalayalam = Anek_Malayalam({
  subsets: ["malayalam", "latin"],
  variable: "--font-anek-malayalam",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: `Walk an illustrated map of the GEN M venue at ${EVENT_PLACE} (${EVENT_DATES}), find every stage, and plan your day with the programme.`,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: "#2c2d6f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${neoverse.variable} ${dhikk.variable} ${anekMalayalam.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-cream text-ink">
        {children}
      </body>
    </html>
  );
}
