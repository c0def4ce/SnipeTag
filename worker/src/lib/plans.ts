import type { PlanTier } from "./database.types";

export interface PlanConfig {
  name: string;
  maxActiveSnipes: number;
  checkIntervalMinutes: number;
  feedDelayMinutes: number;
  historyDays: number;
  crossStore: boolean;
  variantTracking: boolean;
  price: { monthly: number; yearly: number };
  trialDays: number;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    name: "Free",
    maxActiveSnipes: 3,
    checkIntervalMinutes: 360,
    feedDelayMinutes: 30,
    historyDays: 0,
    crossStore: false,
    variantTracking: false,
    price: { monthly: 0, yearly: 0 },
    trialDays: 0,
  },
  pro: {
    name: "Pro",
    maxActiveSnipes: Number.POSITIVE_INFINITY,
    checkIntervalMinutes: 5,
    feedDelayMinutes: 0,
    historyDays: 90,
    crossStore: true,
    variantTracking: true,
    price: { monthly: 4.99, yearly: 29.99 },
    trialDays: 3,
  },
};

export const CHECK_INTERVAL_LABEL: Record<PlanTier, string> = {
  free: "Every 6 hours",
  pro: "Every 5 minutes",
};

/** General catalog cadence derived from a product's priority (1–6 hours). */
export function catalogCheckMinutes(priority: number): number {
  return Math.min(360, Math.max(60, Math.round(360 / Math.max(1, priority))));
}

export function canAddSnipe(plan: PlanTier, activeCount: number): boolean {
  return activeCount < PLANS[plan].maxActiveSnipes;
}

export function hasHistoryAccess(plan: PlanTier): boolean {
  return PLANS[plan].historyDays > 0;
}

export function hasCrossStoreAccess(plan: PlanTier): boolean {
  return PLANS[plan].crossStore;
}
