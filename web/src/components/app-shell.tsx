import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BellRing, ChevronLeft, Crosshair, LayoutGrid, Moon, Plus, Search,
  Settings, Store, Sun, Target, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SnipeModalProvider, useSnipeModal } from "./snipe-modal-provider";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Live Deal Feed", icon: LayoutGrid },
  { href: "/snipes", label: "My Snipes", icon: Crosshair },
  { href: "/retailers", label: "Retailer Directory", icon: Store },
  { href: "/alerts", label: "Alerts", icon: BellRing },
  { href: "/billing", label: "Pro Plan", icon: Zap },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function Omnibar() {
  const { openSnipe } = useSnipeModal();
  const [url, setUrl] = React.useState("");
  return (
    <form className="relative flex w-full max-w-2xl items-center gap-2"
      onSubmit={(e) => { e.preventDefault(); if (url.trim()) { openSnipe(url.trim()); setUrl(""); } }}>
      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
      <Input value={url} onChange={(e) => setUrl(e.target.value)}
        placeholder="Search 100+ stores or paste any product URL to snipe..."
        aria-label="Product URL or retailer" className="pl-9" />
      <Button type="submit" variant="lime" size="sm" className="shrink-0"><Crosshair className="h-4 w-4" /> <span className="hidden sm:inline">Snipe</span></Button>
    </form>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { plan, email, signOut } = useAuth();
  const { openSnipe } = useSnipeModal();
  const [collapsed, setCollapsed] = React.useState(false);
  const pathname = location.pathname;

  return (
    <div className="min-h-screen bg-background">
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-card transition-[width] duration-200 lg:flex lg:flex-col", collapsed ? "w-16" : "w-60")}>
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-gradient text-white"><Target className="h-5 w-5" /></div>
          {!collapsed && <Link to="/" className="text-brand-gradient font-mono text-sm font-bold tracking-tight">SNIPETAG</Link>}
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} to={item.href} title={item.label}
                className={cn("flex h-12 items-center gap-3 rounded-md px-3 text-sm transition-colors", active ? "bg-[hsl(var(--cyan))]/10 text-[hsl(var(--cyan))]" : "text-muted-foreground hover:bg-accent hover:text-foreground", collapsed && "justify-center px-0")}>
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {item.href === "/billing" && !collapsed && plan === "pro" && <Badge variant="cyan" className="ml-auto px-1.5 py-0 text-[9px]">PRO</Badge>}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-border p-3">
          {!collapsed && <p className="truncate px-2 text-xs text-muted-foreground" title={email}>{email || "Not signed in"}</p>}
          <Button variant="ghost" className={cn("w-full justify-start text-muted-foreground", collapsed && "justify-center px-0")} onClick={() => navigate("/settings")} title="Settings">
            <Settings className="h-4 w-4" /> {!collapsed && <span>Settings</span>}
          </Button>
          <Button variant="ghost" className={cn("w-full justify-start text-muted-foreground", collapsed && "justify-center px-0")} onClick={async () => { await signOut(); navigate("/login"); }} title="Sign out">
            <ChevronLeft className="h-4 w-4 rotate-180" /> {!collapsed && <span>Sign out</span>}
          </Button>
          <Button variant="ghost" size="sm" className={cn("w-full justify-start text-muted-foreground", collapsed && "justify-center px-0")} onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar">
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} /> {!collapsed && <span>Collapse</span>}
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md lg:pl-[calc(15rem+1rem)]">
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-gradient text-white"><Target className="h-5 w-5" /></div>
          <Link to="/" className="text-brand-gradient font-mono text-sm font-bold">SNIPETAG</Link>
        </div>
        <div className="ml-auto flex w-full items-center justify-end gap-2 lg:ml-0 lg:w-auto">
          <Omnibar /><ThemeToggle />
        </div>
      </header>

      <main className={cn("px-4 pb-28 pt-6 lg:pb-10 lg:pl-[calc(15rem+2rem)] lg:pr-8", collapsed && "lg:pl-[calc(4rem+2rem)]")}>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        {[
          { href: "/", label: "Feed", icon: LayoutGrid },
          { href: "/snipes", label: "Snipes", icon: Crosshair },
        ].map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} to={item.href} className={cn("flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-medium", active ? "text-[hsl(var(--cyan))]" : "text-muted-foreground")}>
              <item.icon className="h-5 w-5" /> {item.label}
            </Link>
          );
        })}
        <button type="button" aria-label="Add snipe" onClick={() => openSnipe()}
          className="flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient shadow-lg"><Plus className="h-5 w-5" /></span>
          Snipe
        </button>
        {[
          { href: "/alerts", label: "Alerts", icon: BellRing },
          { href: "/settings", label: "Account", icon: Settings },
        ].map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} to={item.href} className={cn("flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-medium", active ? "text-[hsl(var(--cyan))]" : "text-muted-foreground")}>
              <item.icon className="h-5 w-5" /> {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <SnipeModalProvider><ShellInner>{children}</ShellInner></SnipeModalProvider>;
}
