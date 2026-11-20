import * as React from "react";
import { SnipeModal } from "./snipe-modal";

export interface SnipeModalInput {
  url?: string;
  title?: string;
  productId?: string;
  targetPrice?: string;
}

interface Ctx {
  openSnipe: (input?: string | SnipeModalInput) => void;
  refresh: () => void;
  setRefresh: (fn: () => void) => void;
}

const SnipeModalContext = React.createContext<Ctx | null>(null);

export function useSnipeModal() {
  const ctx = React.useContext(SnipeModalContext);
  if (!ctx) throw new Error("useSnipeModal must be used inside SnipeModalProvider");
  return ctx;
}

export function SnipeModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [initial, setInitial] = React.useState<SnipeModalInput>({});
  const refreshRef = React.useRef<() => void>(() => undefined);

  const value = React.useMemo<Ctx>(() => ({
    openSnipe: (input) => {
      setInitial(typeof input === "string" ? { url: input } : (input ?? {}));
      setOpen(true);
    },
    refresh: () => refreshRef.current(),
    setRefresh: (fn) => { refreshRef.current = fn; },
  }), []);

  return (
    <SnipeModalContext.Provider value={value}>
      {children}
      <SnipeModal open={open} onOpenChange={setOpen} initial={initial} onCreated={() => refreshRef.current()} />
    </SnipeModalContext.Provider>
  );
}
