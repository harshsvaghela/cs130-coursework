"use client";

import { useMemo, useState, type FormEvent } from "react";
import { customerHistory, pendingRewardFor, rewardStateFor, searchCustomers, useDb, type Customer } from "@/lib/db";
import { formatDateTime, formatMobile, formatNumber } from "@/lib/format";
import { StampCard } from "@/components/StampCard";
import { ActivityList } from "@/components/ActivityList";
import { StampActionDialog, type StampMode } from "@/components/StampActionDialog";
import { EmptyState, PageTitle, StatusBadge } from "@/components/ui";

export default function StampManagementPage() {
  const data = useDb();
  const req = data.settings.stampRequirement;
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<StampMode>(null);

  const results: Customer[] = useMemo(() => {
    if (!submitted.trim()) return [...data.customers].sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)).slice(0, 6);
    return searchCustomers(data, submitted).slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, submitted]);

  const selected = selectedId ? data.customers.find((c) => c.id === selectedId) ?? null : null;
  const state = selected ? rewardStateFor(data, selected) : null;
  const pending = selected ? pendingRewardFor(data, selected.id) : undefined;
  const awardBlocked = !selected || selected.currentStamps >= req || !!pending;
  const recent = useMemo(
    () => data.txns.filter((t) => t.type === "stamp_added" || t.type === "stamp_removed").slice(0, 8),
    [data.txns],
  );

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(query);
  };

  return (
    <div className="space-y-10">
      <PageTitle
        eyebrow="Stamp desk"
        title="Stamp management"
        description="Find a member, review their progress, then award a confirmed stamp or correct a mistake with a recorded reason."
      />

      <div className="grid gap-8 xl:grid-cols-12">
        {/* Left: search + results */}
        <section className="space-y-5 xl:col-span-5">
          <form onSubmit={onSearch} className="card-luxe reveal flex gap-3 p-4" role="search">
            <label htmlFor="stamp-search" className="sr-only">Search customer</label>
            <input id="stamp-search" className="field" placeholder="Name, mobile or Customer ID" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button type="submit" className="btn-espresso !px-6">Search</button>
          </form>

          <div className="card-luxe reveal p-3">
            <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              {submitted.trim() ? `Results for “${submitted.trim()}”` : "Recently joined"}
            </p>
            {results.length === 0 ? (
              <EmptyState title="No match found" text="Check the spelling, mobile number or Customer ID, or ask the member to show their card." />
            ) : (
              <ul className="divide-y divide-espresso/10">
                {results.map((c) => {
                  const active = c.id === selectedId;
                  const st = rewardStateFor(data, c);
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => setSelectedId(c.id)}
                        aria-current={active ? "true" : undefined}
                        className={`flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left transition ${active ? "bg-espresso text-cream" : "hover:bg-ivory/60"}`}
                      >
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full font-serif text-[16px] ${active ? "bg-gold text-espresso" : "bg-ivory text-choc"}`}>
                          {c.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{c.name}</span>
                          <span className={`block truncate text-[12px] ${active ? "text-ivory/70" : "text-muted"}`}>
                            {formatMobile(c.mobile)} · {c.id}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className={`block font-serif text-[18px] ${active ? "text-gold-soft" : "text-espresso"}`}>
                            {c.currentStamps}/{req}
                          </span>
                          {st === "UNLOCKED" && <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${active ? "text-gold" : "text-choc"}`}>Ready</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Right: selected customer */}
        <section className="space-y-6 xl:col-span-7">
          {selected && state ? (
            <>
              <div className="reveal space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow mb-1">Selected member</p>
                    <h2 className="display text-[34px] leading-tight text-espresso">{selected.name}</h2>
                  </div>
                  <StatusBadge state={state} />
                </div>

                <StampCard customer={selected} stampRequirement={req} rewardName={data.settings.rewardName} rewardState={state} showQR={false} />

                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat k="This cycle" v={`${selected.currentStamps} / ${req}`} />
                  <Stat k="Lifetime" v={formatNumber(selected.lifetimeStamps)} />
                  <Stat k="Last stamp" v={selected.lastStampAt ? formatDateTime(selected.lastStampAt) : "—"} small />
                </div>

                <div className="card-luxe space-y-5 p-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button className="btn-gold w-full" onClick={() => setMode("award")} disabled={awardBlocked}>
                      Award 1 stamp
                    </button>
                    <button className="btn-ghost w-full" onClick={() => setMode("remove")} disabled={selected.currentStamps <= 0 || !!pending}>
                      Remove 1 stamp
                    </button>
                  </div>
                  <ul className="space-y-2 text-[12px] leading-relaxed text-muted">
                    <li>• Awarding asks for confirmation and records the date, time (IST) and your staff ID.</li>
                    <li>• Removing a stamp requires a reason. Stamps cannot go below zero.</li>
                    <li>• {pending ? "A reward is ready — redeem it at the Rewards desk first." : awardBlocked ? "This card is complete for this cycle." : "A short cooldown prevents accidental double stamps."}</li>
                  </ul>
                </div>
              </div>

              <div className="card-luxe reveal p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="eyebrow mb-1">History</p>
                    <h3 className="display text-[24px] text-espresso">Transactions for {selected.name.split(" ")[0]}</h3>
                  </div>
                  <span className="text-[12px] text-muted">{formatNumber(customerHistory(data, selected.id).length)} entries</span>
                </div>
                <ActivityList txns={customerHistory(data, selected.id)} limit={12} showStaff emptyText="No history for this member yet." />
              </div>
            </>
          ) : (
            <div className="card-luxe reveal p-8 sm:p-12">
              <p className="eyebrow mb-3">No member selected</p>
              <h2 className="display text-[34px] leading-tight text-espresso">Choose a member to begin.</h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-choc/75">
                Select someone from the list. You will see their card and progress before you confirm any stamp.
              </p>
            </div>
          )}

          <div className="card-luxe reveal p-6">
            <p className="eyebrow mb-2">Latest stamp changes</p>
            <h3 className="display mb-4 text-[24px] text-espresso">Across all members</h3>
            <ActivityList txns={recent} limit={8} showStaff emptyText="No stamp changes yet." />
          </div>
        </section>
      </div>

      <StampActionDialog mode={mode} customer={selected} onClose={() => setMode(null)} />
    </div>
  );
}

function Stat({ k, v, small }: { k: string; v: string; small?: boolean }) {
  return (
    <div className="card-luxe p-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{k}</p>
      <p className={`mt-2 font-serif leading-tight text-espresso ${small ? "text-[15px]" : "text-[26px]"}`}>{v}</p>
    </div>
  );
}
