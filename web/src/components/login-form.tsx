import * as React from "react";
import { Crosshair, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

function redirectUrl() {
  const base = new URL(import.meta.env.BASE_URL, window.location.origin).href.replace(/\/$/, "");
  return `${base}/auth/callback`;
}

export function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [busy, setBusy] = React.useState<"email" | "google" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email"); setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl() },
    });
    setBusy(null);
    if (err) setError(err.message); else setSent(true);
  }

  async function google() {
    setBusy("google"); setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl() },
    });
    if (err) { setError(err.message); setBusy(null); }
  }

  return (
    <main className="tactical-grid flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-[hsl(var(--cyan))]/30">
        <CardContent className="space-y-6 p-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-gradient text-white"><Crosshair className="h-6 w-6" /></div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Welcome to SnipeTag</h1>
            <p className="mt-2 text-sm text-muted-foreground">Catch the drop before everyone else. No password needed.</p>
          </div>

          {sent ? (
            <div className="rounded-md border border-[hsl(var(--cyan))]/40 bg-[hsl(var(--cyan))]/10 p-4 text-center text-sm text-[hsl(var(--cyan))]">
              Check <strong>{email}</strong> for your magic link.
            </div>
          ) : (
            <form onSubmit={magicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" variant="lime" className="w-full" disabled={busy !== null}>
                {busy === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send magic link
              </Button>
            </form>
          )}

          <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={google} disabled={busy !== null}>
            {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z"/><path fill="currentColor" d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="currentColor" d="M6.4 13.8a6 6 0 0 1 0-3.8V7.4H3.1a10 10 0 0 0 0 9l3.3-2.6Z"/><path fill="currentColor" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4l3.3 2.6C7.2 7.7 9.4 5.9 12 5.9Z"/></svg>}
            Continue with Google
          </Button>
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          <p className="text-center text-[11px] text-muted-foreground">By continuing you agree to receive price and restock alerts.</p>
        </CardContent>
      </Card>
    </main>
  );
}
