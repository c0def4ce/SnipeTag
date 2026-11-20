import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { api } from "./api";
import { supabase } from "./supabase";
import type { PlanTier } from "./database.types";

interface AuthValue {
  user: User | null;
  email: string;
  plan: PlanTier;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [plan, setPlan] = React.useState<PlanTier>("free");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
    setEmail(data.user?.email ?? "");
    if (data.user) {
      try {
        const me = await api<{ plan?: PlanTier; email?: string }>("/api/me");
        setPlan(me.plan === "pro" ? "pro" : "free");
        if (me.email) setEmail(me.email);
      } catch {
        setPlan("free");
      }
    } else {
      setPlan("free");
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void refresh(); });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [refresh]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setEmail("");
    setPlan("free");
  }, []);

  return (
    <AuthContext.Provider value={{ user, email, plan, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
