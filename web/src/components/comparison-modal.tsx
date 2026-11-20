import * as React from "react";
import { ArrowUpRight, GitCompareArrows, Loader2, Store } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Result {
  id: string;
  title: string;
  current_price: number | null;
  in_stock: boolean;
  retailer: string;
  domain: string;
  url: string;
}

export function ComparisonModal({
  gtin, title, open, onOpenChange,
}: {
  gtin: string | null;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [results, setResults] = React.useState<Result[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !gtin) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api<{ products: Result[] }>(`/api/compare?gtin=${encodeURIComponent(gtin)}`, { signal: controller.signal })
      .then((data) => setResults(data.products ?? []))
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [open, gtin]);

  const best = results.find((r) => r.current_price !== null && r.in_stock)?.current_price ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Store className="h-5 w-5 text-[hsl(var(--cyan))]" /> Cross-store comparison</DialogTitle>
        <DialogDescription className="truncate">{title}</DialogDescription>
      </DialogHeader>
      {!gtin ? (
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">No barcode found for this product, so we can&apos;t compare it across stores yet.</p>
      ) : loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <p className="rounded-md border border-[hsl(var(--amber-low))]/40 bg-[hsl(var(--amber-low))]/10 p-3 text-sm text-[hsl(var(--amber-low))]">{error}</p>
      ) : (
        <div className="space-y-2">
          {results.map((r, index) => {
            const isBest = r.current_price === best && r.in_stock;
            const saving = best !== null && r.current_price !== null ? r.current_price - best : 0;
            return (
              <a key={r.id} href={r.url} target="_blank" rel="noreferrer noopener"
                className={cn("flex items-center gap-3 rounded-md border p-3 transition-colors hover:border-[hsl(var(--cyan))]/50", isBest ? "border-[hsl(var(--cyan))]/50 bg-[hsl(var(--cyan))]/5" : "border-border")}>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded font-mono text-xs font-bold", isBest ? "bg-brand-gradient text-white" : "bg-secondary")}>{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.retailer}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.domain}</p>
                </div>
                <div className="text-right">
                  <p className={cn("font-mono text-sm font-semibold tabular-nums", isBest && "text-[hsl(var(--cyan))]")}>{formatMoney(r.current_price)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{!r.in_stock ? "Out of stock" : isBest ? "Best price" : `+${formatMoney(saving)}`}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </a>
            );
          })}
          {results.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No other stores indexed for this barcode yet.</p>}
          <p className="pt-2 text-center text-[10px] text-muted-foreground">Prices refreshed by the SnipeTag priority worker · GTIN {gtin}</p>
          <Badge variant="outline" className="mx-auto flex w-fit font-mono"><GitCompareArrows className="mr-1 h-3 w-3" /> PRO FEATURE</Badge>
        </div>
      )}
    </Dialog>
  );
}
