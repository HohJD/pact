"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0c0f",
          color: "#f6f7f9",
          fontFamily: "Arial, sans-serif",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: "32rem",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "8px",
            background: "#15171c",
            padding: "24px",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#a6abb5", lineHeight: 1.6, fontSize: "0.875rem" }}>
            PACT hit an unexpected error. On phones, some views are heavy — the
            full workspace works best on a desktop or laptop browser.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: 0,
                borderRadius: "6px",
                background: "#4c8dff",
                color: "#fff",
                padding: "8px 16px",
                font: "inherit",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "6px",
                color: "inherit",
                padding: "8px 16px",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              Back to home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
