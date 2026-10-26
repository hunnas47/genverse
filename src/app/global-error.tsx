"use client";

/**
 * Last-resort boundary for failures in the root layout. Styles are inline
 * because the document shell, and possibly global CSS, failed to load.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#2c2d6f",
          color: "#f7f3e8",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.7rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#edf2b5",
            }}
          >
            GEN M Explorer
          </p>
          <h1 style={{ margin: "0.75rem 0 0", fontSize: "1.75rem" }}>
            The site could not start
          </h1>
          <p
            style={{
              margin: "0.75rem 0 0",
              fontSize: "0.95rem",
              lineHeight: 1.6,
              color: "rgba(247, 243, 232, 0.8)",
            }}
          >
            An unexpected error stopped the page before it rendered. Try again,
            or reload the site.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              minHeight: "2.75rem",
              padding: "0.65rem 1.25rem",
              border: 0,
              borderRadius: "999px",
              background: "#edf2b5",
              color: "#2c2d6f",
              font: "inherit",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
