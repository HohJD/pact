"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
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
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="surface w-full max-w-lg p-6">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          PACT hit an unexpected error. On phones, some views are heavy — the full
          workspace works best on a desktop or laptop browser.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
