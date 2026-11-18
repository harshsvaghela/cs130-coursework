"use client";

import { type Txn, type TxnType } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/format";

export const TXN_LABEL: Record<TxnType, string> = {
  customer_registered: "Joined the club",
  stamp_added: "Stamp added",
  stamp_removed: "Stamp removed",
  reward_unlocked: "Reward unlocked",
  reward_redeemed: "Reward redeemed",
};

export const TXN_TONE: Record<TxnType, string> = {
  customer_registered: "bg-ivory text-choc",
  stamp_added: "bg-espresso text-gold",
  stamp_removed: "bg-red-100 text-red-900",
  reward_unlocked: "bg-gold text-espresso",
  reward_redeemed: "bg-choc text-gold-soft",
};

export function TxnIcon({ type }: { type: TxnType }) {
  const glyph: Record<TxnType, string> = {
    customer_registered: "✦",
    stamp_added: "+1",
    stamp_removed: "−1",
    reward_unlocked: "★",
    reward_redeemed: "✓",
  };
  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[12px] font-bold ${TXN_TONE[type]}`} aria-hidden="true">
      {glyph[type]}
    </span>
  );
}

export function ActivityList({
  txns,
  limit = 8,
  showStaff = false,
  emptyText = "No activity yet. Your first stamp will appear here.",
}: {
  txns: Txn[];
  limit?: number;
  showStaff?: boolean;
  emptyText?: string;
}) {
  const rows = txns.slice(0, limit);
  if (rows.length === 0) {
    return <p className="rounded-2xl bg-ivory/60 px-5 py-8 text-center text-[14px] text-muted">{emptyText}</p>;
  }
  return (
    <ol className="divide-y divide-espresso/10">
      {rows.map((t) => (
        <li key={t.id} className="flex items-center gap-4 py-4">
          <TxnIcon type={t.type} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-espresso">{TXN_LABEL[t.type]}</p>
            <p className="mt-0.5 truncate text-[12px] text-muted">
              {formatDate(t.at)} · {formatTime(t.at)}
              {t.reason ? ` · ${t.reason}` : ""}
              {showStaff ? ` · by ${t.staff}` : ""}
            </p>
          </div>
          <div className="text-right">
            {t.stampChange !== 0 ? (
              <p className={`font-serif text-[18px] ${t.stampChange > 0 ? "text-choc" : "text-red-900"}`}>{t.stampChange > 0 ? "+1" : "−1"}</p>
            ) : (
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{t.type === "customer_registered" ? "Welcome" : "Reward"}</p>
            )}
            {showStaff && <p className="font-mono text-[10px] text-muted">{t.id}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
