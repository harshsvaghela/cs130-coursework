// Pure analytics helpers shared by the dashboard, reports and rewards desk.
import type { AppData, Txn } from "./db";
import { istDateKey, istStartOfDay } from "./format";

export const DAY_MS = 86_400_000;

export interface RangeMetrics {
  newRegistrations: number;
  stampsAwarded: number;
  stampsRemoved: number;
  rewardsUnlocked: number;
  rewardsRedeemed: number;
  activeCustomers: number;
  billsWithAmount: number;
  billTotal: number;
}

export function inRange(at: string, fromMs: number, toMs: number): boolean {
  const t = new Date(at).getTime();
  return t >= fromMs && t <= toMs;
}

export function computeRange(data: AppData, fromMs: number, toMs: number): RangeMetrics {
  const txns = data.txns.filter((t) => inRange(t.at, fromMs, toMs));
  const activeIds = new Set(
    txns.filter((t) => t.type === "stamp_added" || t.type === "reward_redeemed").map((t) => t.customerId),
  );
  const bills = txns.filter((t) => t.type === "stamp_added" && typeof t.billAmount === "number");
  return {
    newRegistrations: txns.filter((t) => t.type === "customer_registered").length,
    stampsAwarded: txns.filter((t) => t.type === "stamp_added").length,
    stampsRemoved: txns.filter((t) => t.type === "stamp_removed").length,
    rewardsUnlocked: txns.filter((t) => t.type === "reward_unlocked").length,
    rewardsRedeemed: txns.filter((t) => t.type === "reward_redeemed").length,
    activeCustomers: activeIds.size,
    billsWithAmount: bills.length,
    billTotal: bills.reduce((sum, t) => sum + (t.billAmount || 0), 0),
  };
}

/** Stamps awarded per IST day for the last N days (oldest first). */
export function dailyStampSeries(txns: Txn[], days: number, now = Date.now()) {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(istDateKey(now - i * DAY_MS), 0);
  }
  txns.forEach((t) => {
    if (t.type !== "stamp_added") return;
    const key = istDateKey(t.at);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  });
  return Array.from(buckets.entries()).map(([key, value]) => ({
    key,
    label: `${key.slice(8, 10)}/${key.slice(5, 7)}`,
    value,
  }));
}

/** Buckets for a report range: daily for up to 62 days, otherwise monthly. Clamped to real data. */
export function rangeSeries(data: AppData, fromMs: number, toMs: number) {
  const now = Date.now();
  const earliest = data.txns.reduce((min, t) => Math.min(min, new Date(t.at).getTime()), now);
  const start = Math.max(fromMs, Math.min(earliest, now));
  const end = Math.min(toMs, now + DAY_MS);
  const spanDays = Math.max(1, Math.round((end - start) / DAY_MS));
  const monthly = spanDays > 62;

  const keyOf = (ms: number) => (monthly ? istDateKey(ms).slice(0, 7) : istDateKey(ms));
  const counts = new Map<string, { stamps: number; registrations: number; rewards: number }>();
  const ensure = (k: string) => {
    if (!counts.has(k)) counts.set(k, { stamps: 0, registrations: 0, rewards: 0 });
    return counts.get(k)!;
  };

  if (monthly) {
    let [y, m] = istDateKey(start).split("-").map(Number);
    const [ey, em] = istDateKey(end).split("-").map(Number);
    while (y < ey || (y === ey && m <= em)) {
      ensure(`${y}-${String(m).padStart(2, "0")}`);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  } else {
    for (let t = start; t <= end; t += DAY_MS) ensure(istDateKey(t));
  }

  data.txns.forEach((t) => {
    const ms = new Date(t.at).getTime();
    if (ms < start || ms > end) return;
    const bucket = ensure(keyOf(ms));
    if (t.type === "stamp_added") bucket.stamps += 1;
    if (t.type === "customer_registered") bucket.registrations += 1;
    if (t.type === "reward_unlocked") bucket.rewards += 1;
  });

  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      key,
      label: monthly ? key : `${key.slice(8, 10)}/${key.slice(5, 7)}`,
      ...v,
    }));
}

export function rangeBounds(preset: string, customFrom?: string, customTo?: string): { from: number; to: number; label: string } {
  const now = Date.now();
  const today = istDateKey(now);
  const endToday = istStartOfDay(today, true);
  switch (preset) {
    case "today":
      return { from: istStartOfDay(today), to: endToday, label: "Today" };
    case "7d":
      return { from: istStartOfDay(istDateKey(now - 6 * DAY_MS)), to: endToday, label: "Last 7 days" };
    case "30d":
      return { from: istStartOfDay(istDateKey(now - 29 * DAY_MS)), to: endToday, label: "Last 30 days" };
    case "90d":
      return { from: istStartOfDay(istDateKey(now - 89 * DAY_MS)), to: endToday, label: "Last 90 days" };
    case "custom": {
      const from = customFrom || istDateKey(now - 29 * DAY_MS);
      const to = customTo || today;
      const f = istStartOfDay(from);
      const t = istStartOfDay(to, true);
      return t >= f ? { from: f, to: t, label: "Custom range" } : { from: istStartOfDay(to), to: istStartOfDay(from, true), label: "Custom range" };
    }
    default:
      return { from: 0, to: now + DAY_MS, label: "All time" };
  }
}
