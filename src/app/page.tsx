import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ENTITY_KINDS, entityClass } from "@/lib/theme/entity";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          PACT
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Climate policy intelligence
        </h1>
        <p className="text-dense max-w-md text-muted-foreground">
          Institutional-grade mapping of policies, mechanisms, technologies, and
          outcomes across jurisdictions.
        </p>
      </div>

      <div className="surface flex items-center gap-2 px-4 py-3">
        {ENTITY_KINDS.map((kind) => (
          <Badge
            key={kind}
            variant="outline"
            className={`font-mono text-[11px] ${entityClass(kind, "text")} ${entityClass(kind, "border")}`}
          >
            {kind}
          </Badge>
        ))}
      </div>

      <Separator className="w-48" />
      <ThemeToggle />
    </main>
  );
}
