"use client";

import { useMemo, useState } from "react";
import { rewardStateFor, useDb, customerRewards } from "@/lib/db";
import { formatDate, formatDateTime, formatINR, formatMobile, formatNumber, istDateKey } from "@/lib/format";
import { computeRange, rangeBounds, rangeSeries, DAY_MS } from "@/lib/stats";
import { downloadFile, stamp, toCSV } from "@/lib/csv";
import { toast } from "@/lib/toast";
import { TXN_LABEL } from "@/components/ActivityList";
import { PageTitle } from "@/components/ui";

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
];

export default function ReportsPage() {
  const data = useDb();
  const req = data.settings.stampRequirement;
  const [preset, setPreset] = useState("30d");
  const [customFrom, setCustomFrom] = useState(istDateKey(Date.now() - 29 * DAY_MS));
  const [customTo, setCustomTo] = useState(istDateKey(Date.now()));

  const invalidRange = preset === "custom" && customTo < customFrom;
  const bounds = useMemo(
    () => rangeBounds(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );
  const metrics = useMemo(() => computeRange(data, bounds.from, bounds.to), [data, bounds]);
  const series = useMemo(() => rangeSeries(data, bounds.from, bounds.to), [data, bounds]);
  const maxStamps = Math.max(1, ...series.map((s) => s.stamps));
  const totalCustomers = data.customers.length;
  const rewardReady = data.rewards.filter((r) => r.status === "unlocked").length;
  const inScope = data.txns.filter((t) => {
    const ms = new Date(t.at).getTime();
    return ms >= bounds.from && ms <= bounds.to;
  });

  const periodText = bounds.from === 0 ? "All recorded activity" : `${formatDate(bounds.from)} – ${formatDate(Math.min(bounds.to, Date.now()))}`;

  const exportCustomers = () => {
    const rows = data.customers.map((c) => {
      const rewards = customerRewards(data, c.id);
      return [
        c.id,
        c.name,
        formatMobile(c.mobile),
        c.email,
        formatDateTime(c.registeredAt),
        c.currentStamps,
        c.lifetimeStamps,
        c.cycle,
        rewardStateFor(data, c),
        rewards.filter((r) => r.status === "redeemed").length,
      ];
    });
    downloadFile(
      `casa-tiramisu-customers-${stamp()}.csv`,
      toCSV(
        ["Customer ID", "Name", "Mobile", "Email", "Registered (IST)", "Current stamps", "Lifetime stamps", "Current cycle", "Reward status", "Rewards redeemed"],
        rows,
      ),
    );
    toast(`Customer CSV downloaded (${formatNumber(rows.length)} members).`, "success");
  };

  const exportTransactions = () => {
    const rows = inScope
      .slice()
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((t) => [
        t.id,
        formatDate(t.at),
        formatDateTime(t.at).split(", ")[1]?.replace(" IST", "") ?? "",
        t.customerName,
        t.customerId,
        TXN_LABEL[t.type],
        t.stampChange,
        t.cycle,
        t.staff,
        t.reason || "",
        t.billAmount ?? "",
      ]);
    downloadFile(
      `casa-tiramisu-transactions-${stamp()}.csv`,
      toCSV(["Transaction ID", "Date (IST)", "Time (IST)", "Customer", "Customer ID", "Action", "Stamp change", "Cycle", "Staff", "Note", "Bill amount (INR)"], rows),
    );
    toast(`Transaction CSV downloaded (${formatNumber(rows.length)} rows).`, "success");
  };

  const kpis = [
    { k: "Total customers", v: formatNumber(totalCustomers), n: "All members to date" },
    { k: "New registrations", v: formatNumber(metrics.newRegistrations), n: bounds.label },
    { k: "Total stamps", v: formatNumber(metrics.stampsAwarded), n: `${formatNumber(metrics.stampsRemoved)} corrections removed` },
    { k: "Rewards earned", v: formatNumber(metrics.rewardsUnlocked), n: `${formatNumber(rewardReady)} awaiting redemption` },
    { k: "Rewards redeemed", v: formatNumber(metrics.rewardsRedeemed), n: "Handed over in range" },
    { k: "Active customers", v: formatNumber(metrics.activeCustomers), n: "Stamped or redeemed in range" },
  ];

  return (
    <div className="space-y-10">
      <PageTitle
        eyebrow="Reports"
        title="Loyalty programme reports"
        description="Measure registrations, stamp activity and rewards for any period. Exports are downloaded straight to your device."
        actions={
          <>
            <button className="btn-ghost" onClick={exportCustomers} disabled={data.customers.length === 0}>
              Customers CSV
            </button>
            <button className="btn-espresso" onClick={exportTransactions} disabled={inScope.length === 0 || invalidRange}>
              Transactions CSV
            </button>
          </>
        }
      />

      {/* Date filters */}
      <section className="card-luxe reveal space-y-5 p-5 md:p-6">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1" role="tablist" aria-label="Date range">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              role="tab"
              aria-selected={preset === p.key}
              onClick={() => setPreset(p.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold transition ${preset === p.key ? "bg-espresso text-gold" : "border border-espresso/15 bg-white/60 text-choc hover:border-gold"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="fade-in grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="from" className="label">From (IST)</label>
              <input id="from" type="date" className="field" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div>
              <label htmlFor="to" className="label">To (IST)</label>
              <input id="to" type="date" className="field" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
            {invalidRange && <p role="alert" className="text-[13px] text-red-800 sm:col-span-2">The end date must be on or after the start date.</p>}
          </div>
        )}
        <p className="text-[12px] text-muted">
          Period: <strong className="text-espresso">{periodText}</strong> · Dates use India Standard Time (Asia/Kolkata), DD/MM/YYYY.
        </p>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {kpis.map((k, i) => (
          <div key={k.k} className={`card-luxe reveal reveal-delay-${Math.min(i % 4 + 1, 4)} p-5 md:p-6`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{k.k}</p>
            <p className="mt-3 font-serif text-[40px] leading-none text-espresso">{k.v}</p>
            <p className="mt-2 text-[12px] text-choc/60">{k.n}</p>
          </div>
        ))}
      </section>

      {/* Revenue honesty panel */}
      <section className="panel-dark reveal rounded-[28px] p-6 text-cream shadow-luxe md:p-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <p className="eyebrow mb-3">Recorded bill values</p>
            <p className="font-serif text-[40px] leading-none text-gold-soft">{formatINR(metrics.billTotal)}</p>
            <p className="mt-2 text-[12px] text-ivory/60">
              From {formatNumber(metrics.billsWithAmount)} stamp{metrics.billsWithAmount === 1 ? "" : "s"} where cashiers entered a bill amount.
            </p>
          </div>
          <p className="text-[14px] leading-relaxed text-ivory/80 md:col-span-2">
            Revenue is not estimated. This programme only records a bill amount when a cashier types one in the confirmation step; stamps without an
            amount are not valued. Figures are shown in Indian Rupees (₹, INR) with Indian digit grouping.
          </p>
        </div>
      </section>

      {/* Chart */}
      <section className="card-luxe reveal p-6 md:p-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Programme activity</p>
            <h2 className="display text-[30px] text-espresso">Stamps by {series.length > 0 && series[0].key.length === 7 ? "month" : "day"}</h2>
          </div>
          <p className="text-[12px] text-muted">{formatNumber(series.length)} periods · {bounds.label}</p>
        </div>
        {series.length === 0 ? (
          <p className="py-12 text-center text-muted">No activity in this period.</p>
        ) : (
          <div className="no-scrollbar -mx-2 overflow-x-auto px-2">
            <div className="flex h-56 min-w-full items-end gap-1.5" style={{ minWidth: Math.max(series.length * 22, 320) }} role="img" aria-label="Stamps per period">
              {series.map((s) => (
                <div key={s.key} className="group flex h-full min-w-[14px] flex-1 flex-col justify-end gap-2">
                  <div className="relative flex flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-choc to-[#a68a72] transition-all duration-700 group-hover:from-espresso group-hover:to-gold"
                      style={{ height: `${Math.max(s.stamps ? 6 : 2, (s.stamps / maxStamps) * 100)}%`, opacity: s.stamps ? 1 : 0.2 }}
                      title={`${s.label}: ${s.stamps} stamps, ${s.registrations} registrations, ${s.rewards} rewards`}
                    />
                  </div>
                  <span className="truncate text-center text-[9px] text-muted">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Table */}
      <section className="card-luxe reveal overflow-hidden">
        <div className="border-b border-espresso/10 px-6 py-5">
          <p className="eyebrow mb-1">Breakdown</p>
          <h2 className="display text-[26px] text-espresso">Loyalty activity by period</h2>
        </div>
        {series.length === 0 ? (
          <p className="px-6 py-10 text-center text-muted">Nothing to show.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse">
              <thead className="bg-ivory/50">
                <tr>
                  <th className="table-head">Period</th>
                  <th className="table-head text-right">Registrations</th>
                  <th className="table-head text-right">Stamps</th>
                  <th className="table-head text-right">Rewards unlocked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-espresso/10">
                {[...series].reverse().map((s) => (
                  <tr key={s.key} className="hover:bg-ivory/40">
                    <td className="table-cell font-medium">{s.label}</td>
                    <td className="table-cell text-right">{formatNumber(s.registrations)}</td>
                    <td className="table-cell text-right font-serif text-[17px]">{formatNumber(s.stamps)}</td>
                    <td className="table-cell text-right">{formatNumber(s.rewards)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-center text-[12px] text-muted">
        Reports are calculated from the data stored on this device. Reference: {req} stamps per reward · {data.settings.rewardName}.
      </p>
    </div>
  );
}
