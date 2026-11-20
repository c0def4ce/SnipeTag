import * as React from "react";
import { ArrowUpRight, BellRing, Crosshair, GitCompareArrows, Radio, TrendingDown, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkline } from "./sparkline";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDiscount, formatMoney, nextCheckIn, relativeTime } from "@/lib/format";
import { productAffiliateUrl } from "@/lib/affiliate";
import { CHECK_INTERVAL_LABEL } from "@/lib/plans";
import type { Deal, PriceHistoryPoint } from "@/lib/database.types";

export function DealCard({
  deal, onSnipe, onCompare,
}: {
  deal: Deal;
  onSnipe: (deal: Deal) => void;
  onCompare: (deal: Deal) => void;
}) {
  const { plan } = useAuth();
  const [history, setHistory] = React.useState<PriceHistoryPoint[]>([]);

  React.useEffect(() => {
    if (plan !== "pro") return;
    const controller = new AbortController();
    api<{ history: PriceHistoryPoint[] }>(`/api/history?productId=${deal.id}`, { signal: controller.signal })
      .then((data) => setHistory(data.history ?? []))
      .catch(() => undefined);
    return () => controller.abort();
  }, [deal.id, plan]);

  const initials = deal.retailers.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Card className="group relative flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--cyan))]/40 hover:shadow-neon">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-brand-gradient opacity-70" />
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border bg-secondary font-mono text-[10px] font-bold text-[hsl(var(--cyan))]">{initials}</span>
            <span className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">{deal.retailers.name}</span>
          </div>
          {deal.is_live && plan === "pro" ? (
            <Badge variant="cyan" className="shrink-0 text-[10px]"><Radio className="mr-1 h-2.5 w-2.5 animate-pulse-live" /> LIVE</Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">{plan === "pro" ? "RECENT" : "30m DELAY"}</Badge>
          )}
        </div>

        <a href={productAffiliateUrl(deal)} target="_blank" rel="noreferrer noopener" className="relative block">
          <div className="h-36 overflow-hidden rounded-md border border-border bg-secondary">
            {deal.image_url ? (
              <img src={deal.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>}
          </div>
          <span className="absolute left-2 top-2 rounded bg-[hsl(var(--cyan))] px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-[#0D0F14]">{formatDiscount(deal.discount_pct)}</span>
        </a>

        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{deal.title}</h3>
          <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{deal.category}</p>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-[hsl(var(--cyan))]">{formatMoney(deal.current_price, deal.currency)}</p>
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              {deal.previous_price !== null && <span className="line-through">{formatMoney(deal.previous_price, deal.currency)}</span>}
              {deal.lowest_ever_price !== null && <span>low {formatMoney(deal.lowest_ever_price, deal.currency)}</span>}
            </div>
          </div>
          <div className="text-right text-[10px] text-muted-foreground">
            <p className="flex items-center justify-end gap-1"><Users className="h-3 w-3" />{deal.watcher_count.toLocaleString()}</p>
            <p className="mt-0.5 font-mono tabular-nums">{nextCheckIn(deal.last_checked_at, plan === "pro" ? 5 : 360)}</p>
          </div>
        </div>

        {deal.cheapest_retailer && (
          <div className="flex items-center gap-1.5 rounded border border-[hsl(var(--amber-low))]/40 bg-[hsl(var(--amber-low))]/10 px-2 py-1 text-[11px] text-[hsl(var(--amber-low))]">
            <TrendingDown className="h-3 w-3" /> Cheaper at <strong>{deal.cheapest_retailer}</strong> · {formatMoney(deal.cheapest_price)}
          </div>
        )}
        {plan === "pro" && <Sparkline points={history} />}

        <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
          <Button size="sm" variant="lime" className="flex-1" onClick={() => onSnipe(deal)}><Crosshair className="h-4 w-4" /> Snipe</Button>
          <Button size="icon" variant="outline" aria-label="Compare prices" onClick={() => onCompare(deal)}><GitCompareArrows className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="Open at retailer" asChild>
            <a href={productAffiliateUrl(deal)} target="_blank" rel="noreferrer noopener"><ArrowUpRight className="h-4 w-4" /></a>
          </Button>
        </div>
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><BellRing className="h-2.5 w-2.5" /> checked {relativeTime(deal.last_checked_at)}</p>
      </CardContent>
    </Card>
  );
}
