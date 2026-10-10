"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

export const LAST_QUERY_KEY = "pact.lastQuery";

export function storeLastQuery(q: string) {
  try {
    window.sessionStorage.setItem(LAST_QUERY_KEY, q);
  } catch {
    // storage unavailable
  }
}

const readLastQuery = () => {
  try {
    const q = window.sessionStorage.getItem(LAST_QUERY_KEY);
    return q ? `/workspace?q=${encodeURIComponent(q)}` : "/";
  } catch {
    return "/";
  }
};

/** "← Back to Explore" → the last search (`/workspace?q=…`), or `/` when none. */
export function BackToResults() {
  const href = useSyncExternalStore(
    () => () => {},
    readLastQuery,
    () => "/",
  );
  return (
    <Link
      href={href}
      className="text-[11px] text-muted-foreground hover:text-foreground"
    >
      ← Back to Explore
    </Link>
  );
}
