import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Crosshair, Share2 } from "lucide-react";
import { useSnipeModal } from "./snipe-modal-provider";
import { Button } from "@/components/ui/button";

export function ShareTargetHandler() {
  const [params] = useSearchParams();
  const { openSnipe } = useSnipeModal();
  const url = params.get("url") ?? "";
  const text = params.get("text") ?? "";
  const title = params.get("title") ?? "";
  const productUrl = url || text.match(/https?:\/\/\S+/)?.[0] || text.trim();

  React.useEffect(() => { if (productUrl) openSnipe({ url: productUrl, title }); }, [productUrl, title, openSnipe]);

  return (
    <div className="mx-auto max-w-xl">
      <div className="tactical-grid rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-gradient text-white"><Share2 className="h-6 w-6" /></div>
        <h1 className="mt-4 text-xl font-semibold">Share to snipe</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {productUrl ? "We've opened the snipe modal with your shared link. Set a target and go." : "Share a product link from any retailer and SnipeTag pre-fills the alert."}
        </p>
        {productUrl && <p className="mt-4 truncate rounded border border-border bg-secondary px-3 py-2 font-mono text-xs text-[hsl(var(--cyan))]">{productUrl}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="lime" onClick={() => openSnipe({ url: productUrl, title })}><Crosshair className="h-4 w-4" /> {productUrl ? "Open modal again" : "Add snipe"}</Button>
          <Button variant="ghost" asChild><Link to="/">Back to feed</Link></Button>
        </div>
      </div>
    </div>
  );
}
