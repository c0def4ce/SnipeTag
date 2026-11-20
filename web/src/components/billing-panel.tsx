import * as React from "react";
import { Check, CreditCard, Loader2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PLANS } from "@/lib/plans";

const perks = [
  "Unlimited active snipes", "5-minute sniper checks", "Instant real-time deal feed",
  "Cross-store GTIN price comparison", "90-day price history charts", "Size / variant tracking",
];

export function BillingPanel() {
  const { plan, user, refresh } = useAuth();
  const [loading, setLoading] = React.useState<"monthly" | "yearly" | "portal" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("checkout");
    if (status === "success") { setNotice("Pro is active — instant feed unlocked."); void refresh(); }
    if (status === "cancelled") setNotice("Checkout cancelled. Your plan is unchanged.");
  }, [refresh]);

  async function go(path: string, body: object | undefined, key: "monthly" | "yearly" | "portal") {
    if (!user) { setError("Sign in first to start your trial."); return; }
    setLoading(key); setError(null);
    try {
      const data = await api<{ url: string }>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      window.location.href = data.url;
    } catch (err) { setError(err instanceof Error ? err.message : "Billing unavailable."); setLoading(null); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--cyan))]">Subscription</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Upgrade your arsenal</h1>
        <p className="mt-1 text-sm text-muted-foreground">3 days free. Cancel anytime.</p>
      </div>
      {notice && <div className="rounded-md border border-[hsl(var(--cyan))]/40 bg-[hsl(var(--cyan))]/10 p-3 text-sm text-[hsl(var(--cyan))]">{notice}</div>}
      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <Card className="border-[hsl(var(--cyan))]/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-medium">Current plan</p>
            <p className="text-xs text-muted-foreground">{plan === "pro" ? "Pro — instant feed, 5-minute checks" : `Free — ${PLANS.free.maxActiveSnipes} snipes, 30-minute delayed feed`}</p>
          </div>
          <Badge variant={plan === "pro" ? "cyan" : "outline"}>{plan.toUpperCase()}</Badge>
          {plan === "pro" && (
            <Button variant="outline" onClick={() => go("/api/stripe/portal", undefined, "portal")}>
              {loading === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Manage billing
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">Monthly <Badge variant="outline" className="font-mono">£4.99/mo</Badge></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="font-mono text-3xl font-bold">£4.99<span className="text-sm text-muted-foreground"> /mo</span></p>
            <ul className="space-y-2 text-sm">{perks.map((p) => <li key={p} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--cyan))]" /> {p}</li>)}</ul>
            <Button variant="lime" className="w-full" disabled={loading !== null || plan === "pro"} onClick={() => go("/api/stripe/checkout", { interval: "monthly" }, "monthly")}>
              {loading === "monthly" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} {plan === "pro" ? "Current plan" : "Start 3-day trial"}
            </Button>
          </CardContent>
        </Card>
        <Card className="border-[hsl(var(--magenta))]/50">
          <CardHeader><CardTitle className="flex items-center justify-between">Yearly <Badge variant="cyan" className="font-mono">SAVE 50%</Badge></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="font-mono text-3xl font-bold">£29.99<span className="text-sm text-muted-foreground"> /yr</span></p>
            <ul className="space-y-2 text-sm">{perks.map((p) => <li key={p} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--cyan))]" /> {p}</li>)}</ul>
            <Button variant="lime" className="w-full" disabled={loading !== null || plan === "pro"} onClick={() => go("/api/stripe/checkout", { interval: "yearly" }, "yearly")}>
              {loading === "yearly" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {plan === "pro" ? "Current plan" : "Start 3-day trial"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
