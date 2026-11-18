"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { pendingRewardFor, useDb, type Reward } from "@/lib/db";
import { formatLongDate, formatNumber, istDateKey, TIMEZONE } from "@/lib/format";
import { getSession } from "@/lib/auth";
import { dailyStampSeries, DAY_MS } from "@/lib/stats";
import { ActivityList } from "@/components/ActivityList";
import { PageTitle } from "@/components/ui";

function greeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: TIMEZONE }).format(now));
  if (hour < 12) return "Buongiorno";
  if (hour < 17) return "Buon pomeriggio";
  return "Buonasera";
}

export default function OverviewPage() {
  const data = useDb();
  const [now, setNow] = useState<Date | null>(null);
  const [staff, setStaff] = useState("admin");

  useEffect(() => {
    setNow(new Date());
    setStaff(getSession()?.username ?? "admin");
  }, []);

  const nowMs = now ? now.getTime() : 0;
  const totalCustomers = data.customers.length;
  const stampsIssued = data.txns.filter((t) => t.type === "stamp_added").length;
  const rewardsUnlocked = data.txns.filter((t) => t.type === "reward_unlocked").length;
  const rewardsRedeemed = data.rewards.filter((r) => r.status === "redeemed").length;
  const since = nowMs - 30 * DAY_MS;
  const activeCustomers = new Set(
    data.txns
      .filter((t) => (t.type === "stamp_added" || t.type === "reward_redeemed") && new Date(t.at).getTime() >= since)
      .map((t) => t.customerId),
  ).size;
  const todayKey = now ? istDateKey(nowMs) : "";
  const stampsToday = data.txns.filter((t) => t.type === "stamp_added" && istDateKey(t.at) === todayKey).length;
  const series = now ? dailyStampSeries(data.txns, 14, nowMs) : [];
  const maxValue = Math.max(1, ...series.map((s) => s.value));
  const ready: Reward[] = data.rewards.filter((r) => r.status === "unlocked");
  const nearly = data.customers
    .filter((c) => c.currentStamps >= Math.ceil(data.settings.stampRequirement * 0.75) && !pendingRewardFor(data, c.id))
    .sort((a, b) => b.currentStamps - a.currentStamps)
    .slice(0, 5);

  const kpis = [
    { label: "Total customers", value: formatNumber(totalCustomers), note: "Registered members" },
    { label: "Stamps issued", value: formatNumber(stampsIssued), note: "All-time confirmed stamps" },
    { label: "Rewards unlocked", value: formatNumber(rewardsUnlocked), note: `${data.settings.stampRequirement} stamps each` },
    { label: "Rewards redeemed", value: formatNumber(rewardsRedeemed), note: "Tiramisu Boxes handed over" },
    { label: "Active customers", value: formatNumber(activeCustomers), note: "Stamped in last 30 days" },
  ];

  return (
    <div className="space-y-10">
      <PageTitle
        eyebrow={now ? `${formatLongDate(now)} · IST` : "Overview"}
        title={now ? `${greeting(now)}, ${staff}.` : "Overview"}
        description="A calm view of the loyalty programme: members, confirmed stamps, rewards ready for the counter, and the latest activity."
        actions={
          <>
            <Link href="/admin/scanner" className="btn-espresso">
              Scan a QR code
            </Link>
            <Link href="/admin/stamps" className="btn-ghost">
              Award a stamp
            </Link>
          </>
        }
      />

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-5" aria-label="Key figures">
        {kpis.map((k, i) => (
          <div key={k.label} className={`card-luxe reveal p-5 md:p-6 reveal-delay-${Math.min(i + 1, 4)} ${i === 0 ? "col-span-2 xl:col-span-1" : ""}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{k.label}</p>
            <p className="mt-4 font-serif text-[40px] leading-none text-espresso md:text-[46px]">{k.value}</p>
            <p className="mt-3 text-[12px] text-choc/60">{k.note}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-8 xl:grid-cols-12">
        {/* Chart */}
        <section className="card-luxe reveal p-6 md:p-8 xl:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Stamp activity</p>
              <h2 className="display text-[30px] text-espresso">Last 14 days</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Stamps today</p>
              <p className="font-serif text-[30px] text-choc">{formatNumber(stampsToday)}</p>
            </div>
          </div>
          <div className="mt-10 flex h-56 items-end gap-2 md:gap-3" role="img" aria-label="Bar chart of stamps awarded per day over the last 14 days">
            {series.map((s) => (
              <div key={s.key} className="group flex h-full flex-1 flex-col justify-end gap-2">
                <div className="relative flex flex-1 items-end">
                  <div
                    className="w-full rounded-t-xl bg-gradient-to-t from-choc to-[#a68a72] transition-all duration-700 group-hover:from-espresso group-hover:to-gold"
                    style={{ height: `${Math.max(s.value ? 8 : 3, (s.value / maxValue) * 100)}%`, opacity: s.value ? 1 : 0.25 }}
                    title={`${s.label}: ${s.value} stamps`}
                  />
                  {s.value > 0 && (
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-choc">{s.value}</span>
                  )}
                </div>
                <span className="text-center text-[10px] text-muted">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[12px] text-muted">Counts confirmed stamps per day (IST). Bars update instantly when a stamp is awarded.</p>
        </section>

        {/* Quick actions + glance */}
        <section className="panel-dark reveal reveal-delay-2 rounded-[28px] p-7 text-cream shadow-luxe xl:col-span-4">
          <p className="eyebrow mb-3">Programme at a glance</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="font-serif text-[40px] leading-none text-gold-soft">{data.settings.stampRequirement}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted">Stamps per reward</p>
            </div>
            <div>
              <p className="font-serif text-[40px] leading-none text-gold-soft">{formatNumber(ready.length)}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted">Ready to redeem</p>
            </div>
          </div>
          <p className="mt-6 font-serif text-[18px] italic text-ivory/85">{data.settings.rewardName}</p>
          <div className="hairline my-7 opacity-60" />
          <p className="eyebrow mb-4">Quick actions</p>
          <div className="space-y-2">
            {[
              { href: "/admin/scanner", t: "Open QR scanner", s: "Cashier mode — scan, confirm, stamp" },
              { href: "/admin/customers", t: "Find a customer", s: "Search by name, mobile or ID" },
              { href: "/admin/rewards", t: "Rewards desk", s: `${formatNumber(ready.length)} awaiting redemption` },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="group flex items-center justify-between rounded-2xl border border-gold/15 bg-dark/30 px-4 py-3.5 transition hover:border-gold/50 hover:bg-dark/60">
                <span>
                  <span className="block text-[14px] font-medium text-cream">{a.t}</span>
                  <span className="block text-[12px] text-muted">{a.s}</span>
                </span>
                <span className="text-gold transition group-hover:translate-x-1">→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Ready to redeem */}
        <section className="card-luxe reveal p-6 md:p-8 xl:col-span-5">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="eyebrow mb-2">Rewards</p>
              <h2 className="display text-[28px] text-espresso">Ready at the counter</h2>
            </div>
            <Link href="/admin/rewards" className="text-[12px] font-semibold uppercase tracking-[0.16em] text-choc hover:text-gold">
              Open desk →
            </Link>
          </div>
          {ready.length === 0 ? (
            <p className="rounded-2xl bg-ivory/60 px-5 py-8 text-center text-[14px] text-muted">No rewards are waiting. Completed cards will appear here.</p>
          ) : (
            <ul className="divide-y divide-espresso/10">
              {ready.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-espresso">{r.customerName}</p>
                    <p className="text-[12px] text-muted">Unlocked {r.unlockedAt ? formatShort(r.unlockedAt) : ""}</p>
                  </div>
                  <Link href="/admin/rewards" className="btn-sm bg-gold text-espresso">
                    Redeem
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {nearly.length > 0 && (
            <div className="mt-8">
              <p className="eyebrow mb-3">Almost there</p>
              <ul className="space-y-3">
                {nearly.map((c) => (
                  <li key={c.id} className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-[13px]">
                        <span className="truncate text-espresso">{c.name}</span>
                        <span className="font-semibold text-choc">
                          {c.currentStamps} / {data.settings.stampRequirement}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ivory">
                        <div className="h-full rounded-full bg-gradient-to-r from-choc to-gold" style={{ width: `${(c.currentStamps / data.settings.stampRequirement) * 100}%` }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section className="card-luxe reveal p-6 md:p-8 xl:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow mb-2">Audit trail</p>
              <h2 className="display text-[28px] text-espresso">Recent activity</h2>
            </div>
            <Link href="/admin/transactions" className="text-[12px] font-semibold uppercase tracking-[0.16em] text-choc hover:text-gold">
              All transactions →
            </Link>
          </div>
          <ActivityList txns={data.txns} limit={7} showStaff emptyText="No transactions recorded yet." />
        </section>
      </div>
    </div>
  );
}

function formatShort(iso: string) {
  return istDateKey(iso).split("-").reverse().join("/");
}
