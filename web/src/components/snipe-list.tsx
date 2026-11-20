import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BellRing, Crosshair, Pause, Play, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkline } from "./sparkline";
import { useSnipeModal } from "./snipe-modal-provider";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney, nextCheckIn, relativeTime } from "@/lib/format";
import { productAffiliateUrl } from "@/lib/affiliate";
import { CHECK_INTERVAL_LABEL } from "@/lib/plans";
import type { PriceHistoryPoint, SnipeWithProduct } from "@/lib/database.types";

export function SnipeList({ onlyTriggered = false }: { onlyTriggered?: boolean }) {
  const { plan, user } = useAuth();
  const { openSnipe } = useSnipeModal();
  const [snipes, setSnipes] = React.useState<SnipeWithProduct[]>([]);
  const [history, setHistory] = React.useState<Record<string, PriceHistoryPoint[]>>({});
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ snipes: SnipeWithProduct[] }>("/api/snipes");
      const all = data.snipes ?? [];
      setSnipes(onlyTriggered ? all.filter((s) => s.status === "triggered") : all);
      if (plan === "pro") {
        const ids = [...new Set(all.map((s) => s.product_id))];
        const pairs = await Promise.all(ids.map(async (id) => {
          try {
            const res = await api<{ history: PriceHistoryPoint[] }>(`/api/history?productId=${id}`);
            return [id, res.history ?? []] as const;
          } catch { return [id, []] as const; }
        }));
        setHistory(Object.fromEntries(pairs));
      }
    } catch { setSnipes([]); }
    finally { setLoading(false); }
  }, [plan, onlyTriggered]);

  React.useEffect(() => { if (user) void load(); else setLoading(false); }, [load, user]);

  async function mutate(id: string, method: "PATCH" | "DELETE", body?: object) {
    await api(`/api/snipes/${id}`, { method, body: body ? JSON.stringify(body) : undefined }).catch(() => undefined);
    void load();
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-10 text-center">
        <Crosshair className="mx-auto h-10 w-10 text-[hsl(var(--cyan))]" />
        <h1 className="mt-4 text-xl font-semibold">Sign in to manage snipes</h1>
        <p className="mt-2 text-sm text-muted-foreground">Magic link or Google — no password needed.</p>
        <Button variant="lime" className="mt-6" asChild><Link to="/login">Sign in</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--cyan))]"><BellRing className="h-3.5 w-3.5" /> {onlyTriggered ? "Notifications" : "Active watchlist"}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{onlyTriggered ? "Triggered alerts" : "My snipes"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {onlyTriggered ? "Targets hit and restocks caught." : `${snipes.filter((s) => s.status === "active").length} active · checks ${CHECK_INTERVAL_LABEL[plan].toLowerCase()}.`}
          </p>
        </div>
        {!onlyTriggered && <Button variant="lime" onClick={() => openSnipe()}><Crosshair className="h-4 w-4" /> Add snipe</Button>}
      </div>

      {loading ? <p className="py-16 text-center text-sm text-muted-foreground">Loading snipes…</p> : snipes.length === 0 ? (
        <div className="tactical-grid rounded-lg border border-dashed border-border px-6 py-20 text-center">
          <Crosshair className="mx-auto h-12 w-12 text-[hsl(var(--cyan))]/70" />
          <h2 className="mt-4 text-lg font-semibold">{onlyTriggered ? "No alerts yet" : "No snipes yet"}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {onlyTriggered ? "When a target hits or an item restocks, the alert lands here and as a push notification." : "Paste any product URL to start tracking a price or a restock."}
          </p>
          {!onlyTriggered && <Button variant="lime" className="mt-6" onClick={() => openSnipe()}>Create your first snipe</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {snipes.map((snipe) => {
            const product = snipe.products;
            return (
              <Card key={snipe.id} className="overflow-hidden">
                <CardContent className="space-y-3 p-4">
                  <div className="flex gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-secondary">
                      {product.image_url && <img src={product.image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold">{product.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{product.retailers.name}{snipe.variant_label && ` · ${snipe.variant_label}`}</p>
                    </div>
                    <Badge variant={snipe.status === "triggered" ? "cyan" : snipe.status === "paused" ? "secondary" : "outline"} className="h-fit shrink-0 text-[10px]">{snipe.status.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="font-mono text-2xl font-bold tabular-nums text-[hsl(var(--cyan))]">{formatMoney(product.current_price, product.currency)}</p>
                      {snipe.target_price !== null && <p className="font-mono text-xs tabular-nums text-muted-foreground">target {formatMoney(snipe.target_price, product.currency)}</p>}
                    </div>
                    <div className="text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                      <p>next check {nextCheckIn(product.last_checked_at, plan === "pro" ? 5 : 360)}</p>
                      <p>checked {relativeTime(product.last_checked_at)}</p>
                    </div>
                  </div>
                  {plan === "pro" && <Sparkline points={history[snipe.product_id] ?? []} target={snipe.target_price} />}
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <a href={productAffiliateUrl(product)} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[hsl(var(--cyan))]">View deal <ArrowUpRight className="h-3 w-3" /></a>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" aria-label={snipe.status === "paused" ? "Resume" : "Pause"} onClick={() => mutate(snipe.id, "PATCH", { status: snipe.status === "paused" ? "active" : "paused" })}>
                        {snipe.status === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Delete" className="hover:text-destructive" onClick={() => mutate(snipe.id, "DELETE")}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
