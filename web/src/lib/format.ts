export function formatMoney(amount: number | null | undefined, currency = "GBP"): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDiscount(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "—";
  return `-${Math.abs(pct).toFixed(1)}%`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function nextCheckIn(lastChecked: string | null, intervalMinutes: number): string {
  if (!lastChecked) return "queued";
  const due = new Date(lastChecked).getTime() + intervalMinutes * 60_000;
  const remaining = Math.max(0, due - Date.now());
  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1000);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
