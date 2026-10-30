import type { Metadata, Viewport } from "next";
import { Anek_Malayalam } from "next/font/google";
import localFont from "next/font/local";

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
  title: "GENVerse | GEN M Explorer",
  description:
    "Explore the GEN M beach venue, find every stage, and browse the official session programme.",
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
