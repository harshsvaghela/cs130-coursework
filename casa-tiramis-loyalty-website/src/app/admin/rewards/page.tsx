"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { redeemReward, useDb, type Reward } from "@/lib/db";
import { formatDateTime, formatMobile, formatNumber } from "@/lib/format";
import { getSession } from "@/lib/auth";
import { toast } from "@/lib/toast";
import { EmptyState, Modal, PageTitle, Spinner, StatusBadge } from "@/components/ui";

export default function RewardsDeskPage() {
  const data = useDb();
  const [target, setTarget] = useState<Reward | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; reward: string; next: number } | null>(null);
  const [historyQuery, setHistoryQuery] = useState("");

  const ready = useMemo(() => data.rewards.filter((r) => r.status === "unlocked").sort((a, b) => a.unlockedAt.localeCompare(b.unlockedAt)), [data.rewards]);
  const redeemed = useMemo(
    () =>
      data.rewards
        .filter((r) => r.status === "redeemed")
        .filter((r) => !historyQuery.trim() || `${r.customerName} ${r.customerId} ${r.id}`.toLowerCase().includes(historyQuery.trim().toLowerCase()))
        .sort((a, b) => (b.redeemedAt || "").localeCompare(a.redeemedAt || "")),
    [data.rewards, historyQuery],
  );
  const cyclesCompleted = data.customers.reduce((sum, c) => sum + (c.cycle - 1), 0);
  const targetCustomer = target ? data.customers.find((c) => c.id === target.customerId) : undefined;

  const confirm = () => {
    if (!target || busy) return;
    setBusy(true);
    setError(null);
    const res = redeemReward(target.id, getSession()?.username ?? data.settings.adminUsername);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone({ name: target.customerName, reward: target.name, next: res.data?.cycle ?? 1 });
    setTarget(null);
    toast(res.message || "Reward redeemed", "success");
  };

  return (
    <div className="space-y-10">
      <PageTitle
        eyebrow="Rewards desk"
        title="Rewards management"
        description="Redeem completed Tiramisu Boxes at the counter. Redemption starts the customer's next cycle and every record is kept."
        actions={
          <Link href="/admin/settings" className="btn-ghost">
            Reward settings
          </Link>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { k: "Ready to redeem", v: formatNumber(ready.length), n: "Unlocked, awaiting handover" },
          { k: "Redeemed (all-time)", v: formatNumber(data.rewards.filter((r) => r.status === "redeemed").length), n: "Handed over and recorded" },
          { k: "Cycles completed", v: formatNumber(cyclesCompleted), n: "Across all members" },
          { k: "Stamps per reward", v: `${data.settings.stampRequirement}`, n: data.settings.rewardName },
        ].map((t) => (
          <div key={t.k} className="card-luxe reveal p-5 md:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{t.k}</p>
            <p className="mt-3 font-serif text-[38px] leading-none text-espresso">{t.v}</p>
            <p className="mt-2 text-[12px] text-choc/60">{t.n}</p>
          </div>
        ))}
      </section>

      {done && (
        <section role="status" className="reveal flex flex-col gap-4 rounded-[28px] border border-gold/50 bg-gold/15 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow mb-2 !text-choc">Redemption recorded</p>
            <p className="font-serif text-[24px] text-espresso">
              {done.reward} handed to {done.name}.
            </p>
            <p className="mt-1 text-[13px] text-choc/80">Cycle {done.next} has started. Stamps reset to 0 and all previous history is kept.</p>
          </div>
          <button onClick={() => setDone(null)} className="btn-ghost !py-2.5 shrink-0">
            Dismiss
          </button>
        </section>
      )}

      {/* Ready queue */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Awaiting redemption</p>
            <h2 className="display text-[32px] text-espresso">Ready at the counter</h2>
          </div>
        </div>
        {ready.length === 0 ? (
          <EmptyState
            title="No rewards waiting"
            text="When a member completes their card, the reward appears here, ready for a one-tap redemption after you confirm it in person."
            action={
              <Link href="/admin/stamps" className="btn-ghost">
                Go to Stamp Management
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ready.map((r, i) => {
              const c = data.customers.find((x) => x.id === r.customerId);
              return (
                <article key={r.id} className={`panel-dark reveal reveal-delay-${Math.min(i + 1, 4)} relative overflow-hidden rounded-[28px] p-6 text-cream shadow-luxe ring-1 ring-gold/25`}>
                  <div className="pointer-events-none absolute inset-[10px] rounded-[20px] border border-gold/15" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <StatusBadge state="UNLOCKED" />
                      <span className="font-mono text-[11px] text-muted">{r.id}</span>
                    </div>
                    <p className="mt-6 font-serif text-[28px] leading-tight">{r.customerName}</p>
                    <p className="mt-1 font-mono text-[12px] text-ivory/60">
                      {r.customerId}
                      {c ? ` · ${formatMobile(c.mobile)}` : ""}
                    </p>
                    <div className="mt-5 rounded-2xl border border-gold/20 bg-dark/40 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Reward</p>
                      <p className="mt-1 font-serif text-[18px] text-gold-soft">{r.name}</p>
                      <p className="mt-2 text-[12px] text-ivory/60">Cycle {r.cycle} · Unlocked {formatDateTime(r.unlockedAt)}</p>
                    </div>
                    <button className="btn-gold mt-6 w-full" onClick={() => { setError(null); setTarget(r); }}>
                      Redeem reward
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* History */}
      <section className="space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-2">Permanent record</p>
            <h2 className="display text-[32px] text-espresso">Redemption history</h2>
          </div>
          <div className="w-full md:w-80">
            <label htmlFor="rw-search" className="sr-only">Search redemptions</label>
            <input id="rw-search" className="field" placeholder="Search name, ID or reward ID" value={historyQuery} onChange={(e) => setHistoryQuery(e.target.value)} />
          </div>
        </div>
        {redeemed.length === 0 ? (
          <p className="card-luxe p-8 text-center text-[14px] text-muted">{data.rewards.some((r) => r.status === "redeemed") ? "No redemptions match your search." : "No rewards have been redeemed yet."}</p>
        ) : (
          <>
            <div className="card-luxe hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse">
                <thead className="border-b border-espresso/10 bg-ivory/50">
                  <tr>
                    <th className="table-head">Reward ID</th>
                    <th className="table-head">Customer</th>
                    <th className="table-head">Cycle</th>
                    <th className="table-head">Unlocked</th>
                    <th className="table-head">Redeemed (IST)</th>
                    <th className="table-head">Redeemed by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-espresso/10">
                  {redeemed.map((r) => (
                    <tr key={r.id} className="hover:bg-ivory/40">
                      <td className="table-cell font-mono text-[12px]">{r.id}</td>
                      <td className="table-cell"><span className="font-serif text-[17px]">{r.customerName}</span><span className="block font-mono text-[11px] text-muted">{r.customerId}</span></td>
                      <td className="table-cell">{r.cycle}</td>
                      <td className="table-cell whitespace-nowrap text-[13px]">{formatDateTime(r.unlockedAt)}</td>
                      <td className="table-cell whitespace-nowrap text-[13px]">{r.redeemedAt ? formatDateTime(r.redeemedAt) : "—"}</td>
                      <td className="table-cell text-[13px]">{r.redeemedBy || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="grid gap-3 md:hidden">
              {redeemed.map((r) => (
                <li key={r.id} className="card-luxe p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-serif text-[20px] text-espresso">{r.customerName}</p>
                    <StatusBadge state="REDEEMED" />
                  </div>
                  <p className="mt-2 text-[12px] text-muted">{r.customerId} · Cycle {r.cycle}</p>
                  <p className="mt-2 text-[13px] text-choc/80">Redeemed {r.redeemedAt ? formatDateTime(r.redeemedAt) : "—"} by {r.redeemedBy}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Confirmation popup */}
      <Modal
        open={!!target}
        onClose={() => !busy && setTarget(null)}
        eyebrow="Confirm handover"
        title="Redeem this reward?"
        dismissible={!busy}
        footer={
          <>
            <button className="btn-ghost w-full sm:w-auto" onClick={() => setTarget(null)} disabled={busy}>
              Cancel
            </button>
            <button className="btn-espresso w-full sm:w-auto" onClick={confirm} disabled={busy}>
              {busy ? <Spinner /> : null} Confirm redemption
            </button>
          </>
        }
      >
        {target && (
          <div className="space-y-5">
            <p className="text-[15px] leading-relaxed text-choc/85">
              Confirm that <strong className="text-espresso">{target.customerName}</strong> has presented their card and is collecting{" "}
              <strong className="text-espresso">{target.name}</strong>.
            </p>
            <ul className="space-y-2 rounded-2xl bg-white/60 p-5 text-[13px] text-choc/85">
              <li>• The reward is marked as redeemed with today's date and time.</li>
              <li>• The card resets to 0 stamps and Cycle {target.cycle + 1} begins.</li>
              <li>• Previous stamps, transactions and reward history are kept.</li>
              {targetCustomer && <li>• Customer ID: <span className="font-mono">{targetCustomer.id}</span></li>}
            </ul>
            {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-red-900">{error}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
