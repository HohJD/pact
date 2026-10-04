export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
  );
}
