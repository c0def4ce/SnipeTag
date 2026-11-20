import * as React from "react";
import { Link } from "react-router-dom";
import { Flame, Radio, SlidersHorizontal, Zap } from "lucide-react";
import { DealCard } from "./deal-card";
import { ComparisonModal } from "./comparison-modal";
import { useSnipeModal } from "./snipe-modal-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Deal, Retailer } from "@/lib/database.types";

const CATEGORIES = ["All", "Tech", "Fashion", "Gaming", "Home", "Marketplaces", "Beauty", "Sports"];

export function DealFeed() {
  const { plan } = useAuth();
  const { openSnipe } = useSnipeModal();
  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [retailers, setRetailers] = React.useState<(Retailer & { product_count: number })[]>([]);
  const [category, setCategory] = React.useState("All");
  const [retailer, setRetailer] = React.useState("all");
  const [minDiscount, setMinDiscount] = React.useState(15);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [compare, setCompare] = React.useState<Deal | null>(null);

  React.useEffect(() => {
    api<{ retailers: (Retailer & { product_count: number })[] }>("/api/retailers", {}, false)
      .then((data) => setRetailers(data.retailers ?? []))
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const query = new URLSearchParams({ category, retailer, minDiscount: String(minDiscount) });
    api<{ deals: Deal[] }>(`/api/deals?${query}`, { signal: controller.signal })
      .then((data) => { setDeals(data.deals ?? []); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [category, retailer, minDiscount]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--cyan))]"><Radio className="h-3.5 w-3.5 animate-pulse-live" /> Live deal radar</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Verified price drops</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cross-checking {retailers.length || "100+"} stores for drops worth your attention.</p>
        </div>
        {plan === "pro" ? (
          <Badge variant="magenta" className="px-3 py-1"><Zap className="mr-1 h-3 w-3" /> INSTANT ACCESS</Badge>
        ) : (
          <Link to="/billing" className="inline-flex h-9 items-center gap-2 rounded-md border border-[hsl(var(--magenta))]/50 px-3 text-xs text-[hsl(var(--magenta))]"><Zap className="h-3.5 w-3.5" /> Unlock instant drops</Link>
        )}
      </div>

      {plan === "free" && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-[hsl(var(--amber-low))]/30 bg-[hsl(var(--amber-low))]/5 px-4 py-2.5 text-sm">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--amber-low))]" />
          <span className="text-[hsl(var(--amber-low))]">Free feed is delayed by 30 minutes.</span>
          <Link to="/billing" className="ml-auto text-xs underline underline-offset-4 hover:text-[hsl(var(--cyan))]">Upgrade to Pro for real-time</Link>
        </div>
      )}
      {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" /> Filters</div>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={cn("min-h-12 shrink-0 rounded-full border px-4 text-sm transition-colors", category === c ? "border-transparent bg-brand-gradient font-semibold text-white" : "border-border bg-secondary text-muted-foreground hover:text-foreground")}>
              {c}
            </button>
          ))}
        </div>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button onClick={() => setRetailer("all")} className={cn("min-h-10 shrink-0 rounded-full border px-3 text-xs", retailer === "all" ? "border-[hsl(var(--cyan))]/60 text-[hsl(var(--cyan))]" : "border-border text-muted-foreground")}>All stores</button>
          {retailers.slice(0, 18).map((r) => (
            <button key={r.id} onClick={() => setRetailer(r.id)} className={cn("min-h-10 shrink-0 rounded-full border px-3 text-xs", retailer === r.id ? "border-[hsl(var(--cyan))]/60 text-[hsl(var(--cyan))]" : "border-border text-muted-foreground")}>
              {r.name} <span className="font-mono tabular-nums opacity-60">{r.product_count}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Minimum discount</span>
          {[15, 25, 40].map((d) => (
            <button key={d} onClick={() => setMinDiscount(d)} className={cn("min-h-9 rounded border px-3 font-mono text-xs tabular-nums", minDiscount === d ? "border-[hsl(var(--cyan))] text-[hsl(var(--cyan))]" : "border-border text-muted-foreground")}>{d}%+</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-80 w-full" />)}</div>
      ) : deals.length === 0 ? (
        <div className="tactical-grid rounded-lg border border-dashed border-border px-6 py-20 text-center">
          <Flame className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No deals match those filters</h2>
          <p className="mt-2 text-sm text-muted-foreground">Try a lower discount threshold or another category.</p>
          <Button variant="outline" className="mt-5" onClick={() => { setCategory("All"); setRetailer("all"); setMinDiscount(15); }}>Reset filters</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal}
              onSnipe={(d) => openSnipe({ url: d.normalized_url, title: d.title, productId: d.id, targetPrice: d.current_price ? (d.current_price * 0.85).toFixed(2) : "" })}
              onCompare={setCompare} />
          ))}
        </div>
      )}

      <ComparisonModal gtin={compare?.gtin_ean ?? null} title={compare?.title ?? ""} open={compare !== null} onOpenChange={(open) => { if (!open) setCompare(null); }} />
    </div>
  );
}
