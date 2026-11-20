import * as React from "react";
import { Crosshair, Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { CHECK_INTERVAL_LABEL } from "@/lib/plans";
import type { SnipeModalInput } from "./snipe-modal-provider";

interface Preview {
  title: string;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  inStock: boolean;
  retailer: { name: string };
  gtinEan: string | null;
  source: string;
}

export function SnipeModal({
  open, onOpenChange, initial, onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: SnipeModalInput;
  onCreated: () => void;
}) {
  const { plan } = useAuth();
  const [url, setUrl] = React.useState("");
  const [targetPrice, setTargetPrice] = React.useState("");
  const [variantLabel, setVariantLabel] = React.useState("");
  const [alertOnRestock, setAlertOnRestock] = React.useState(true);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setUrl(initial.url ?? "");
    setTargetPrice(initial.targetPrice ?? "");
    setVariantLabel("");
    setAlertOnRestock(true);
    setPreview(null);
    setError(null);
  }, [open, initial]);

  React.useEffect(() => {
    if (!open || initial.productId || !/^https?:\/\/\S+\.\S+/.test(url)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const data = await api<{ product: Preview }>("/api/extract", {
          method: "POST",
          body: JSON.stringify({ url }),
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setPreview(data.product);
          if (!targetPrice && data.product.price) setTargetPrice((data.product.price * 0.85).toFixed(2));
        }
      } catch (err) {
        if (!controller.signal.aborted && err instanceof Error) setError(err.message);
      } finally { setLoadingPreview(false); }
    }, 700);
    return () => { clearTimeout(timer); controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, open, initial.productId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api("/api/snipes", {
        method: "POST",
        body: JSON.stringify({
          url, productId: initial.productId, targetPrice, alertOnRestock,
          variantLabel: plan === "pro" ? variantLabel : null,
        }),
      });
      onCreated();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create this snipe.");
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Crosshair className="h-5 w-5 text-[hsl(var(--cyan))]" /> New snipe</DialogTitle>
        <DialogDescription>Paste any product URL — we detect the store, extract the metadata and watch it for you.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="snipe-url">Product URL</Label>
          <div className="relative">
            <Input id="snipe-url" type="url" required={!initial.productId} placeholder="https://retailer.co.uk/product/123" value={url} onChange={(e) => setUrl(e.target.value)} className="pr-10" autoFocus />
            {loadingPreview && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          {preview && (
            <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/50 p-2">
              {preview.imageUrl && <img src={preview.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{preview.title}</p>
                <p className="font-mono text-xs tabular-nums text-[hsl(var(--cyan))]">
                  {formatMoney(preview.price, preview.currency)} · {preview.inStock ? "In stock" : "Out of stock"}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">{preview.retailer.name}</Badge>
            </div>
          )}
          {initial.productId && <p className="text-xs text-[hsl(var(--cyan))]">Tracking this deal directly · we&apos;ll use its indexed price.</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="target-price">Target price</Label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-sm text-muted-foreground">£</span>
              <Input id="target-price" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="89.99" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="pl-7 font-mono tabular-nums" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="variant" className="flex items-center gap-1.5">
              Size / variant
              {plan === "pro" ? <Badge variant="cyan" className="px-1.5 py-0 text-[10px]"><Sparkles className="h-2.5 w-2.5" /> PRO</Badge> : <span className="text-[10px] text-muted-foreground">(Pro)</span>}
            </Label>
            <Input id="variant" placeholder="e.g. UK 10 / Black" value={variantLabel} onChange={(e) => setVariantLabel(e.target.value)} disabled={plan !== "pro"} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <Label htmlFor="restock">Alert on restock</Label>
            <p className="text-xs text-muted-foreground">Flash restock alerts fire the moment stock flips.</p>
          </div>
          <Switch id="restock" checked={alertOnRestock} onCheckedChange={setAlertOnRestock} />
        </div>

        <p className="text-xs text-muted-foreground">
          Check interval: <span className="font-mono tabular-nums text-foreground">{CHECK_INTERVAL_LABEL[plan]}</span>
        </p>
        {error && <p className="rounded-md border border-[hsl(var(--amber-low))]/40 bg-[hsl(var(--amber-low))]/10 p-2 text-sm text-[hsl(var(--amber-low))]">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" variant="lime" disabled={submitting || (!url && !initial.productId)}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />} Start sniping
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
