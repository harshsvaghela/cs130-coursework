"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { customerHistory, customerRewards, rewardStateFor, searchCustomers, useDb, type Customer } from "@/lib/db";
import { formatDate, formatMobile, formatNumber, formatDateTime } from "@/lib/format";
import { cardUrl } from "@/lib/session";
import { downloadFile, stamp, toCSV } from "@/lib/csv";
import { toast } from "@/lib/toast";
import { StampCard } from "@/components/StampCard";
import { ActivityList } from "@/components/ActivityList";
import { StampActionDialog, type StampMode } from "@/components/StampActionDialog";
import { QRCodeImage } from "@/components/QRCodeImage";
import { EmptyState, Modal, PageTitle, StatusBadge } from "@/components/ui";

type Filter = "all" | "ready" | "progress" | "start" | "redeemed";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All members" },
  { key: "ready", label: "Reward ready" },
  { key: "progress", label: "In progress" },
  { key: "start", label: "Not started" },
  { key: "redeemed", label: "Redeemed" },
];

export default function CustomersPage() {
  const data = useDb();
  const req = data.settings.stampRequirement;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [stampMode, setStampMode] = useState<StampMode>(null);
  const [stampTarget, setStampTarget] = useState<Customer | null>(null);

  const rows = useMemo(() => {
    const base = query.trim() ? searchCustomers(data, query) : data.customers;
    return base
      .filter((c) => {
        const state = rewardStateFor(data, c);
        switch (filter) {
          case "ready":
            return state === "UNLOCKED";
          case "progress":
            return state === "LOCKED" && c.currentStamps > 0;
          case "start":
            return c.currentStamps === 0 && state === "LOCKED";
          case "redeemed":
            return customerRewards(data, c.id).some((r) => r.status === "redeemed");
          default:
            return true;
        }
      })
      .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, query, filter]);

  const open = openId ? data.customers.find((c) => c.id === openId) ?? null : null;

  const startStamp = (mode: Exclude<StampMode, null>, c: Customer) => {
    setOpenId(null);
    setStampTarget(c);
    setStampMode(mode);
  };

  const exportCsv = () => {
    const csv = toCSV(
      ["Customer ID", "Name", "Mobile", "Email", "Registered (IST)", "Current stamps", "Lifetime stamps", "Cycle", "Reward status"],
      data.customers.map((c) => [
        c.id,
        c.name,
        formatMobile(c.mobile),
        c.email,
        formatDateTime(c.registeredAt),
        c.currentStamps,
        c.lifetimeStamps,
        c.cycle,
        rewardStateFor(data, c),
      ]),
    );
    downloadFile(`casa-tiramisu-customers-${stamp()}.csv`, csv);
    toast(`Exported ${formatNumber(data.customers.length)} customers to CSV.`, "success");
  };

  return (
    <div className="space-y-8">
      <PageTitle
        eyebrow="Members"
        title="Customer management"
        description="Search every member by name, mobile or Customer ID. Open a profile to view the card, QR code, history and stamp actions."
        actions={
          <button className="btn-ghost" onClick={exportCsv}>
            Export CSV
          </button>
        }
      />

      {/* Toolbar */}
      <section className="card-luxe reveal flex flex-col gap-5 p-5 md:p-6">
        <div className="relative">
          <label htmlFor="cust-search" className="sr-only">
            Search customers
          </label>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4.2-4.2" />
            </svg>
          </span>
          <input
            id="cust-search"
            className="field !pl-11"
            placeholder="Search by name, mobile number or Customer ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1" role="tablist" aria-label="Filter members">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                filter === f.key ? "bg-espresso text-gold" : "border border-espresso/15 bg-white/60 text-choc hover:border-gold"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-muted">
          Showing <strong className="text-espresso">{formatNumber(rows.length)}</strong> of {formatNumber(data.customers.length)} members
        </p>
      </section>

      {rows.length === 0 ? (
        <EmptyState
          title="No members match"
          text={query ? "Try a different name, mobile number or Customer ID, or clear the filter." : "No members in this group yet."}
          action={
            <button className="btn-ghost" onClick={() => { setQuery(""); setFilter("all"); }}>
              Clear search and filters
            </button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <section className="card-luxe hidden overflow-hidden md:block reveal">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse">
                <thead className="border-b border-espresso/10 bg-ivory/50">
                  <tr>
                    <th className="table-head">Customer</th>
                    <th className="table-head">Mobile</th>
                    <th className="table-head">Customer ID</th>
                    <th className="table-head">Registered</th>
                    <th className="table-head">Current</th>
                    <th className="table-head">Lifetime</th>
                    <th className="table-head">Reward</th>
                    <th className="table-head text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-espresso/10">
                  {rows.map((c) => {
                    const state = rewardStateFor(data, c);
                    return (
                      <tr key={c.id} className="transition hover:bg-ivory/40">
                        <td className="table-cell">
                          <button onClick={() => setOpenId(c.id)} className="text-left">
                            <span className="block font-serif text-[18px] leading-tight text-espresso hover:text-choc">{c.name}</span>
                            <span className="text-[12px] text-muted">{c.email || "No email on file"}</span>
                          </button>
                        </td>
                        <td className="table-cell whitespace-nowrap font-mono text-[13px]">{formatMobile(c.mobile)}</td>
                        <td className="table-cell font-mono text-[13px] tracking-wide">{c.id}</td>
                        <td className="table-cell whitespace-nowrap text-[13px]">{formatDate(c.registeredAt)}</td>
                        <td className="table-cell">
                          <Progress count={c.currentStamps} req={req} />
                        </td>
                        <td className="table-cell font-serif text-[18px]">{formatNumber(c.lifetimeStamps)}</td>
                        <td className="table-cell">
                          <StatusBadge state={state} />
                        </td>
                        <td className="table-cell">
                          <div className="flex justify-end gap-2">
                            <button className="btn-sm border border-espresso/20 text-espresso hover:border-gold" onClick={() => setOpenId(c.id)}>
                              View
                            </button>
                            <button className="btn-sm bg-espresso text-cream hover:bg-choc" onClick={() => startStamp("award", c)} disabled={state === "UNLOCKED" || c.currentStamps >= req}>
                              + Stamp
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Mobile cards */}
          <section className="grid gap-4 md:hidden">
            {rows.map((c, i) => {
              const state = rewardStateFor(data, c);
              return (
                <article key={c.id} className={`card-luxe reveal p-5 reveal-delay-${Math.min(i + 1, 4)}`}>
                  <button onClick={() => setOpenId(c.id)} className="block w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-serif text-[22px] leading-tight text-espresso">{c.name}</p>
                        <p className="mt-1 font-mono text-[12px] text-muted">{c.id}</p>
                      </div>
                      <StatusBadge state={state} />
                    </div>
                    <p className="mt-3 text-[13px] text-choc/75">{formatMobile(c.mobile)} · Joined {formatDate(c.registeredAt)}</p>
                    <div className="mt-4">
                      <Progress count={c.currentStamps} req={req} />
                    </div>
                    <p className="mt-3 text-[12px] text-muted">Lifetime stamps: {formatNumber(c.lifetimeStamps)}</p>
                  </button>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button className="btn-sm justify-center border border-espresso/20 text-espresso" onClick={() => setOpenId(c.id)}>
                      View profile
                    </button>
                    <button className="btn-sm justify-center bg-espresso text-cream disabled:opacity-40" onClick={() => startStamp("award", c)} disabled={state === "UNLOCKED" || c.currentStamps >= req}>
                      + Stamp
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}

      {/* Customer drawer */}
      <Modal
        open={!!open}
        onClose={() => setOpenId(null)}
        eyebrow="Member profile"
        title={open?.name ?? ""}
        width="max-w-3xl"
      >
        {open && (
          <CustomerDetail customer={open} onAward={() => startStamp("award", open)} onRemove={() => startStamp("remove", open)} />
        )}
      </Modal>

      <StampActionDialog
        mode={stampMode}
        customer={stampTarget}
        onClose={() => {
          setStampMode(null);
          setStampTarget(null);
        }}
      />
    </div>
  );
}

function Progress({ count, req }: { count: number; req: number }) {
  const pct = Math.min(100, Math.round((count / req) * 100));
  return (
    <div className="min-w-[120px]">
      <div className="flex items-baseline gap-1">
        <span className="font-serif text-[20px] text-espresso">{count}</span>
        <span className="text-[12px] text-muted">/ {req}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ivory">
        <div className="h-full rounded-full bg-gradient-to-r from-choc to-gold transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CustomerDetail({ customer, onAward, onRemove }: { customer: Customer; onAward: () => void; onRemove: () => void }) {
  const data = useDb();
  const live = data.customers.find((c) => c.id === customer.id) ?? customer;
  const state = rewardStateFor(data, live);
  const rewards = customerRewards(data, live.id);
  const history = customerHistory(data, live.id);
  const req = data.settings.stampRequirement;
  const [showQR, setShowQR] = useState(false);
  const locked = state === "UNLOCKED";

  return (
    <div className="grid gap-8 md:grid-cols-5">
      <div className="space-y-5 md:col-span-3">
        <StampCard customer={live} stampRequirement={req} rewardName={data.settings.rewardName} rewardState={state} compact showQR={false} />

        <div className="grid grid-cols-2 gap-3">
          <button className="btn-espresso w-full !px-4" onClick={onAward} disabled={locked || live.currentStamps >= req}>
            Add stamp
          </button>
          <button className="btn-ghost w-full !px-4" onClick={onRemove} disabled={live.currentStamps <= 0 || locked}>
            Remove stamp
          </button>
        </div>
        {locked && <p className="text-[12px] text-muted">Reward is ready. Redeem it at the Rewards desk before changing stamps.</p>}

        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <Info k="Mobile" v={formatMobile(live.mobile)} />
          <Info k="Email" v={live.email || "—"} />
          <Info k="Customer ID" v={live.id} mono />
          <Info k="Card no." v={live.cardNumber.replace(/(\d{4})(?=\d)/g, "$1 ").trim()} mono />
          <Info k="Registered" v={formatDateTime(live.registeredAt)} />
          <Info k="Last stamp" v={live.lastStampAt ? formatDateTime(live.lastStampAt) : "—"} />
          <Info k="Current cycle" v={`Cycle ${live.cycle}`} />
          <Info k="Lifetime stamps" v={formatNumber(live.lifetimeStamps)} />
        </div>
      </div>

      <div className="space-y-6 md:col-span-2">
        <div className="card-luxe p-5 text-center">
          <button className="btn-ghost w-full !py-2.5" onClick={() => setShowQR((s) => !s)} aria-expanded={showQR}>
            {showQR ? "Hide QR code" : "View QR code"}
          </button>
          {showQR && (
            <div className="fade-in mt-5 flex flex-col items-center gap-4">
              <QRCodeImage value={cardUrl(live.id)} size={180} alt={`QR code for ${live.id}`} />
              <p className="max-w-[220px] text-[12px] leading-relaxed text-muted">Contains the card link with the Customer ID only — no personal data.</p>
              <button
                className="text-[12px] font-semibold uppercase tracking-[0.16em] text-choc hover:text-gold"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(cardUrl(live.id));
                    toast("Card link copied.", "info");
                  } catch {
                    toast("Could not copy automatically. Select and copy the ID instead.", "error");
                  }
                }}
              >
                Copy card link
              </button>
            </div>
          )}
        </div>

        <div className="card-luxe p-5">
          <p className="eyebrow mb-3">Reward history</p>
          {rewards.length === 0 ? (
            <p className="text-[13px] text-muted">No rewards yet.</p>
          ) : (
            <ul className="space-y-3 text-[13px]">
              {rewards.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="text-espresso">
                    Cycle {r.cycle} · {r.status === "redeemed" && r.redeemedAt ? formatDate(r.redeemedAt) : formatDate(r.unlockedAt)}
                  </span>
                  <StatusBadge state={r.status === "redeemed" ? "REDEEMED" : "UNLOCKED"} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-luxe p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow">History</p>
            <Link href="/admin/transactions" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-choc hover:text-gold">
              All →
            </Link>
          </div>
          <ActivityList txns={history} limit={6} showStaff emptyText="No history yet." />
        </div>
      </div>
    </div>
  );
}

function Info({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-espresso/10 bg-white/50 p-3.5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted">{k}</p>
      <p className={`mt-1 break-words text-espresso ${mono ? "font-mono text-[12px]" : "font-medium"}`}>{v}</p>
    </div>
  );
}
