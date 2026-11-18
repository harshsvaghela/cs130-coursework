"use client";

import { useMemo, useState } from "react";
import { useDb, type TxnType } from "@/lib/db";
import { formatDate, formatINR, formatNumber, formatTime } from "@/lib/format";
import { downloadFile, stamp, toCSV } from "@/lib/csv";
import { toast } from "@/lib/toast";
import { TXN_LABEL, TxnIcon } from "@/components/ActivityList";
import { EmptyState, PageTitle, StatusBadge } from "@/components/ui";

type Filter = "all" | TxnType;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "stamp_added", label: "Stamp Added" },
  { key: "stamp_removed", label: "Stamp Removed" },
  { key: "reward_unlocked", label: "Reward Unlocked" },
  { key: "reward_redeemed", label: "Reward Redeemed" },
  { key: "customer_registered", label: "Registrations" },
];

const PAGE = 60;

export default function TransactionsPage() {
  const data = useDb();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.txns
      .filter((t) => filter === "all" || t.type === filter)
      .filter(
        (t) =>
          !q ||
          t.id.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q) ||
          t.customerId.toLowerCase().includes(q) ||
          t.staff.toLowerCase().includes(q) ||
          (t.reason || "").toLowerCase().includes(q),
      )
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [data.txns, filter, query]);

  const visible = rows.slice(0, limit);

  const exportCsv = () => {
    const csv = toCSV(
      ["Transaction ID", "Date (IST)", "Time (IST)", "Customer", "Customer ID", "Action", "Stamp change", "Cycle", "Staff", "Note", "Bill amount (INR)"],
      rows.map((t) => [
        t.id,
        formatDate(t.at),
        formatTime(t.at),
        t.customerName,
        t.customerId,
        TXN_LABEL[t.type],
        t.stampChange > 0 ? `+${t.stampChange}` : t.stampChange,
        t.cycle,
        t.staff,
        t.reason || "",
        t.billAmount ?? "",
      ]),
    );
    downloadFile(`casa-tiramisu-transactions-${stamp()}.csv`, csv);
    toast(`Exported ${formatNumber(rows.length)} transactions.`, "success");
  };

  return (
    <div className="space-y-8">
      <PageTitle
        eyebrow="Audit trail"
        title="Transaction history"
        description="Every registration, stamp, correction and reward event — with date, time (IST), customer and the staff member who acted."
        actions={
          <button className="btn-ghost" onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </button>
        }
      />

      <section className="card-luxe reveal space-y-5 p-5 md:p-6">
        <div>
          <label htmlFor="tx-search" className="sr-only">Search transactions</label>
          <input id="tx-search" className="field" placeholder="Search by customer, Customer ID, transaction ID, staff or reason" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} />
        </div>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1" role="tablist" aria-label="Filter transactions">
          {FILTERS.map((f) => {
            const count = f.key === "all" ? data.txns.length : data.txns.filter((t) => t.type === f.key).length;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => { setFilter(f.key); setLimit(PAGE); }}
                className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold transition ${filter === f.key ? "bg-espresso text-gold" : "border border-espresso/15 bg-white/60 text-choc hover:border-gold"}`}
              >
                {f.label} <span className="ml-1 opacity-60">{formatNumber(count)}</span>
              </button>
            );
          })}
        </div>
      </section>

      {rows.length === 0 ? (
        <EmptyState title="No transactions found" text="Try a different filter or search term. New activity appears here the moment it happens." />
      ) : (
        <>
          <section className="card-luxe reveal hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead className="border-b border-espresso/10 bg-ivory/50">
                  <tr>
                    <th className="table-head">Transaction ID</th>
                    <th className="table-head">Date</th>
                    <th className="table-head">Time (IST)</th>
                    <th className="table-head">Customer</th>
                    <th className="table-head">Customer ID</th>
                    <th className="table-head">Action</th>
                    <th className="table-head">Stamp</th>
                    <th className="table-head">Staff</th>
                    <th className="table-head">Note</th>
                    <th className="table-head text-right">Bill</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-espresso/10">
                  {visible.map((t) => (
                    <tr key={t.id} className="hover:bg-ivory/40">
                      <td className="table-cell font-mono text-[12px]">{t.id}</td>
                      <td className="table-cell whitespace-nowrap text-[13px]">{formatDate(t.at)}</td>
                      <td className="table-cell whitespace-nowrap text-[13px]">{formatTime(t.at)}</td>
                      <td className="table-cell font-serif text-[17px]">{t.customerName}</td>
                      <td className="table-cell font-mono text-[12px]">{t.customerId}</td>
                      <td className="table-cell">
                        <span className="inline-flex items-center gap-2 text-[13px] font-medium">
                          <TxnIcon type={t.type} />
                          {TXN_LABEL[t.type]}
                        </span>
                      </td>
                      <td className={`table-cell font-serif text-[18px] ${t.stampChange < 0 ? "text-red-900" : t.stampChange > 0 ? "text-choc" : "text-muted"}`}>
                        {t.stampChange > 0 ? "+1" : t.stampChange < 0 ? "−1" : "—"}
                      </td>
                      <td className="table-cell text-[13px]">{t.staff}</td>
                      <td className="table-cell max-w-[240px] text-[12px] text-muted">{t.reason || "—"}</td>
                      <td className="table-cell whitespace-nowrap text-right text-[13px]">{typeof t.billAmount === "number" ? formatINR(t.billAmount) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <ul className="grid gap-3 md:hidden">
            {visible.map((t) => (
              <li key={t.id} className="card-luxe p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <TxnIcon type={t.type} />
                    <div>
                      <p className="font-medium text-espresso">{TXN_LABEL[t.type]}</p>
                      <p className="font-mono text-[11px] text-muted">{t.id}</p>
                    </div>
                  </div>
                  {t.stampChange !== 0 && <p className="font-serif text-[20px] text-choc">{t.stampChange > 0 ? "+1" : "−1"}</p>}
                </div>
                <p className="mt-3 font-serif text-[18px] text-espresso">{t.customerName}</p>
                <p className="font-mono text-[11px] text-muted">{t.customerId}</p>
                <p className="mt-3 text-[12px] text-choc/75">
                  {formatDate(t.at)} · {formatTime(t.at)} · by {t.staff}
                </p>
                {t.reason && <p className="mt-2 text-[12px] italic text-muted">{t.reason}</p>}
                {typeof t.billAmount === "number" && <p className="mt-2 text-[12px] text-choc/80">Bill: {formatINR(t.billAmount)}</p>}
                {t.type === "reward_redeemed" || t.type === "reward_unlocked" ? (
                  <div className="mt-3"><StatusBadge state={t.type === "reward_redeemed" ? "REDEEMED" : "UNLOCKED"} /></div>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="flex flex-col items-center gap-3 pt-2 text-[13px] text-muted">
            <p>
              Showing {formatNumber(visible.length)} of {formatNumber(rows.length)} entries
            </p>
            {visible.length < rows.length && (
              <button className="btn-ghost" onClick={() => setLimit((l) => l + PAGE)}>
                Load more
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
