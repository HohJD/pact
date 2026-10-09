import { cn } from "@/lib/utils";

/** Country flag via flag-icons. `code` is a ISO alpha-2 (country_code). */
export function Flag({
  code,
  name,
  className,
}: {
  code?: string | null;
  name?: string;
  className?: string;
}) {
  if (!code) return null;
  return (
    <span
      className={cn("fi", `fi-${code.toLowerCase()}`, className)}
      title={name ?? code}
    />
  );
}
