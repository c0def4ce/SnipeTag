import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, GitCompareArrows, History, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { disablePush, enablePush, getPushSupport } from "@/lib/push-client";
import { CHECK_INTERVAL_LABEL, PLANS } from "@/lib/plans";

export function SettingsPanel() {
  const { plan, email, user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [pushState, setPushState] = React.useState({ supported: false, permission: "unsupported", subscribed: false });
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const support = getPushSupport();
    setPushState({ ...support, subscribed: support.permission === "granted" });
  }, []);

  async function togglePush() {
    if (!user) { setMessage("Sign in first to enable push alerts."); return; }
    setBusy(true); setMessage(null);
    try {
      if (pushState.subscribed) { await disablePush(); setPushState((s) => ({ ...s, subscribed: false })); }
      else { await enablePush(); setPushState((s) => ({ ...s, subscribed: true, permission: "granted" })); }
    } catch (err) { setMessage(err instanceof Error ? err.message : "Push setup failed."); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--cyan))]">Settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Account &amp; alerts</h1>
      </div>
      {message && <p className="rounded-md border border-[hsl(var(--amber-low))]/40 bg-[hsl(var(--amber-low))]/10 p-3 text-sm text-[hsl(var(--amber-low))]">{message}</p>}

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Email</span><span className="truncate font-mono text-xs">{email || "Not signed in"}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Plan</span><Badge variant={plan === "pro" ? "cyan" : "outline"}>{plan.toUpperCase()}</Badge></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Check frequency</span><span className="font-mono text-xs tabular-nums">{CHECK_INTERVAL_LABEL[plan]}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Deal feed</span><span className="font-mono text-xs tabular-nums">{PLANS[plan].feedDelayMinutes === 0 ? "Instant" : "30 min delay"}</span></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-muted-foreground"><History className="h-3.5 w-3.5" /> History</span><span className="font-mono text-xs tabular-nums">{PLANS[plan].historyDays} days</span></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-muted-foreground"><GitCompareArrows className="h-3.5 w-3.5" /> Cross-store</span><span className="font-mono text-xs">{PLANS[plan].crossStore ? "Enabled" : "Pro only"}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Web Push works on Windows desktop and Android Chrome, even before you install the PWA.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={togglePush} disabled={!pushState.supported || busy}>
              <Bell className="h-4 w-4" /> {busy ? "Working…" : pushState.subscribed ? "Disable push alerts" : "Enable push alerts"}
            </Button>
            {!pushState.supported && <span className="text-xs text-[hsl(var(--amber-low))]">This browser doesn&apos;t support Web Push.</span>}
            {pushState.permission === "denied" && <span className="text-xs text-destructive">Notifications blocked — change this in browser settings.</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}><Moon className="h-4 w-4" /> Dark</Button>
            <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}><Sun className="h-4 w-4" /> Light</Button>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={async () => { await signOut(); navigate("/login"); }} className="w-full sm:w-auto"><LogOut className="h-4 w-4" /> Sign out</Button>
    </div>
  );
}
