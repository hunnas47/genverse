import type { Metadata } from "next";

/**
 * Canonical public origin for link previews (og:url, og:image, canonical).
 *
 * Set explicitly rather than relying on Next's fallback: that falls back to
 * VERCEL_PROJECT_PRODUCTION_URL, which is genm-explorer.vercel.app, and that
 * domain now 307-redirects to genm-world.vercel.app. Crawlers (WhatsApp in
 * particular) are unreliable about following redirects for preview images.
 * Override with NEXT_PUBLIC_SITE_URL if the domain changes. In `next dev`,
 * Next still resolves social images against localhost.
 */
export const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://genm-world.vercel.app",
);

export const SITE_NAME = "GEN M Explorer";

/** Factual event line used in titles, descriptions, and the preview image. */
export const EVENT_DATES = "13–15 Nov 2026";
export const EVENT_PLACE = "Kozhikode Beach";

const PREVIEW_ALT = `${SITE_NAME}: an illustrated map of the GEN M venue at ${EVENT_PLACE}, ${EVENT_DATES}.`;

/**
 * Per-route title, description, Open Graph, and X card.
 *
 * The preview image is the static `src/app/opengraph-image.jpg` /
 * `twitter-image.jpg` (rebuild with `python3 scripts/make-og-image.py`). It is
 * listed here explicitly because a page that sets its own `openGraph` object
 * replaces the image inherited from the root. `og:title` repeats the site name
 * because the layout's title template only applies to `<title>`.
 */
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  /** Use `title` as-is instead of appending the site name. */
  absoluteTitle?: boolean;
}): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_IN",
      url: path,
      title: fullTitle,
      description,
      images: [
        {
          url: "/opengraph-image.jpg",
          width: 1200,
          height: 630,
          alt: PREVIEW_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [{ url: "/twitter-image.jpg", alt: PREVIEW_ALT }],
    },
  };
}
