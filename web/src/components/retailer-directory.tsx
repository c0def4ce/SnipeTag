import * as React from "react";
import { Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Retailer } from "@/lib/database.types";

type Row = Retailer & { product_count: number };
const CATEGORIES = ["All", "Tech", "Fashion", "Gaming", "Home", "Marketplaces", "Beauty", "Sports"];

export function RetailerDirectory() {
  const [retailers, setRetailers] = React.useState<Row[]>([]);
  const [category, setCategory] = React.useState("All");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api<{ retailers: Row[] }>(`/api/retailers?category=${encodeURIComponent(category)}`, { signal: controller.signal }, false)
      .then((d) => setRetailers(d.retailers ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [category]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--cyan))]"><Store className="h-3.5 w-3.5" /> Coverage</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Retailer directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every store in the SnipeTag radar, with its ingestion method and indexed deal count.</p>
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={cn("min-h-12 shrink-0 rounded-full border px-4 text-sm transition-colors", category === c ? "border-transparent bg-brand-gradient font-semibold text-white" : "border-border bg-secondary text-muted-foreground hover:text-foreground")}>{c}</button>
        ))}
      </div>
      {loading ? <p className="py-16 text-center text-sm text-muted-foreground">Loading retailers…</p> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {retailers.map((r) => (
            <Card key={r.id} className="transition-colors hover:border-[hsl(var(--cyan))]/40">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-secondary font-mono text-xs font-bold text-[hsl(var(--cyan))]">
                  {r.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.domain}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                  <p className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground">{r.product_count} deals · {r.parser_type}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
