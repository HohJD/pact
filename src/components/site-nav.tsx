"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Search" },
  { href: "/workspace", label: "Explore" },
  { href: "/admin/ingest", label: "Admin" },
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
      <div className="flex items-baseline gap-3">
        <Link
          href="/"
          className="font-mono text-[14px] font-semibold tracking-[0.25em]"
        >
          PACT
        </Link>
        <span className="hidden text-[11px] text-muted-foreground sm:inline">
          Climate policy intelligence
        </span>
      </div>
      <nav className="flex items-center gap-4 text-[12px]">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              pathname === l.href
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        ))}
        <ThemeToggle />
      </nav>
    </header>
  );
}
