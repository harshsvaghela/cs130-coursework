"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { customerHistory, findCustomerById, rewardStateFor, searchCustomers, useDb } from "@/lib/db";
import { formatMobile, formatDateTime, normalizeMobile } from "@/lib/format";
import { cardUrl, clearActiveCustomerId, getActiveCustomerId, setActiveCustomerId } from "@/lib/session";
import { toast } from "@/lib/toast";
import { StampCard } from "@/components/StampCard";
import { ActivityList } from "@/components/ActivityList";
import { EmptyState, Spinner } from "@/components/ui";

export default function CardPage() {
  const data = useDb();
  const [ready, setReady] = useState(false);
  const [scanId, setScanId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setScanId(params.get("cid"));
    setPrefill(params.get("m") || "");
    setActiveId(getActiveCustomerId());
    setReady(true);
    const sync = () => setActiveId(getActiveCustomerId());
    window.addEventListener("casa-active-customer", sync);
    return () => window.removeEventListener("casa-active-customer", sync);
  }, []);

  if (!ready) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const viewingScan = !!scanId;
  const customer = findCustomerById(data, (scanId || activeId || "").trim() || "NONE");
  const isMine = !!customer && customer.id === activeId;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-16">
      {customer ? (
        <div className="grid gap-10 md:grid-cols-12">
          <section className="reveal md:col-span-7">
            <p className="eyebrow mb-3">{viewingScan ? "Scanned loyalty card" : "Your loyalty card"}</p>
            <h1 className="display mb-8 text-[38px] leading-[1.02] text-espresso md:text-[50px]">
              {viewingScan ? "Customer card." : <>Grazie, <span className="italic text-choc">{customer.name.split(" ")[0]}.</span></>}
            </h1>
            <StampCard
              customer={customer}
              stampRequirement={data.settings.stampRequirement}
              rewardName={data.settings.rewardName}
              rewardState={rewardStateFor(data, customer)}
              qrValue={cardUrl(customer.id)}
              showQR
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                className="btn-espresso w-full"
                onClick={async () => {
                  const url = cardUrl(customer.id);
                  const text = `My Casa Tiramisù loyalty card — ${customer.currentStamps} of ${data.settings.stampRequirement} stamps`;
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: "Casa Tiramisù", text, url });
                      return;
                    }
                    await navigator.clipboard.writeText(url);
                    toast("Card link copied. Paste it anywhere to share.", "info");
                  } catch {
                    toast("Sharing was cancelled.", "info");
                  }
                }}
              >
                Share my card
              </button>
              <Link href={viewingScan ? `/profile?cid=${customer.id}` : "/profile"} className="btn-ghost w-full">
                Open profile
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/reward" className="btn-ghost w-full">
                Reward status
              </Link>
              {viewingScan && !isMine ? (
                <button
                  className="btn-ghost w-full"
                  onClick={() => {
                    setActiveCustomerId(customer.id);
                    toast("Saved to this device.", "success");
                  }}
                >
                  Save to this device
                </button>
              ) : (
                <button
                  className="btn-ghost w-full"
                  onClick={() => {
                    clearActiveCustomerId();
                    setScanId(null);
                    toast("Card removed from this device.", "info");
                  }}
                >
                  Not you? Sign out of card
                </button>
              )}
            </div>
            {rewardStateFor(data, customer) === "UNLOCKED" && (
              <Link href="/reward" className="mt-6 flex items-center justify-between rounded-[24px] border border-gold/50 bg-gold/15 px-6 py-5 transition hover:bg-gold/25">
                <span>
                  <span className="block font-serif text-[22px] text-espresso">Your reward is ready</span>
                  <span className="text-[13px] text-choc/80">Show this card at the counter to redeem.</span>
                </span>
                <span className="text-gold">→</span>
              </Link>
            )}
          </section>

          <aside className="reveal reveal-delay-2 md:col-span-5">
            <div className="card-luxe p-6 sm:p-8">
              <p className="eyebrow mb-2">Latest activity</p>
              <h2 className="display mb-4 text-[28px] text-espresso">Your stamps</h2>
              <ActivityList txns={customerHistory(data, customer.id)} limit={6} />
            </div>
            <div className="mt-6 rounded-[24px] bg-ivory/60 p-6 text-[13px] leading-relaxed text-choc/75">
              <p className="font-semibold text-espresso">How your stamps work</p>
              <p className="mt-2">
                Show your QR at the counter after each eligible purchase. Our cashier confirms the purchase and adds one stamp. Scanning a QR never
                adds a stamp on its own.
              </p>
              <p className="mt-3">Mobile: {formatMobile(customer.mobile)} · Last stamp: {customer.lastStampAt ? formatDateTime(customer.lastStampAt) : "—"}</p>
            </div>
          </aside>
        </div>
      ) : (
        <Lookup
          prefill={prefill}
          staleId={activeId && !viewingScan ? activeId : null}
          onFound={(id) => {
            setActiveCustomerId(id);
            setActiveId(id);
          }}
        />
      )}
    </div>
  );
}

function Lookup({ prefill, staleId, onFound }: { prefill: string; staleId: string | null; onFound: (id: string) => void }) {
  const data = useDb();
  const [query, setQuery] = useState(prefill);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (prefill) setQuery(prefill);
  }, [prefill]);

  useEffect(() => {
    if (staleId) {
      clearActiveCustomerId();
    }
  }, [staleId]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const q = query.trim();
    if (!q) {
      setError("Enter your mobile number or Customer ID.");
      return;
    }
    const isMobileLike = /^[+\d\s()-]+$/.test(q);
    if (isMobileLike && !normalizeMobile(q)) {
      setError("Enter a valid 10-digit Indian mobile number, for example +91 98765 43210.");
      return;
    }
    const matches = searchCustomers(data, q);
    setSearched(true);
    if (matches.length === 0) {
      setError("We could not find a card for that number or ID.");
      return;
    }
    onFound(matches[0].id);
    toast(`Welcome back, ${matches[0].name.split(" ")[0]}.`, "success");
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-12">
      <section className="reveal md:col-span-6">
        <p className="eyebrow mb-4">My card</p>
        <h1 className="display text-[44px] leading-[1.02] text-espresso md:text-[56px]">
          Find your <span className="italic text-choc">card.</span>
        </h1>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-choc/75">
          Enter the Indian mobile number you registered with, or your Customer ID. Your card will open on this device so you can always find it.
        </p>
        {staleId && (
          <p role="status" className="mt-6 rounded-2xl bg-gold/15 px-4 py-3 text-[13px] text-choc">
            The card saved on this device could not be found, so it has been cleared. Please look it up again.
          </p>
        )}
      </section>
      <section className="reveal reveal-delay-2 md:col-span-6">
        <form onSubmit={submit} noValidate className="card-luxe relative overflow-hidden p-6 sm:p-10">
          <div className="hairline absolute inset-x-0 top-0" />
          <label htmlFor="lookup" className="label">
            Mobile number or Customer ID
          </label>
          <input
            id="lookup"
            className={`field ${error ? "field-invalid" : ""}`}
            placeholder="+91 98765 43210 or CT-7K3M9P"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-invalid={!!error}
            autoComplete="off"
          />
          {error && (
            <p role="alert" className="mt-3 text-[13px] text-red-800">
              {error}
            </p>
          )}
          <button type="submit" className="btn-espresso mt-6 w-full">
            Open my card
          </button>
          {searched && !error && <p className="mt-3 text-center text-[12px] text-muted">Opening…</p>}
          <div className="mt-8 border-t border-espresso/10 pt-6 text-center text-[14px] text-muted">
            New to Casa Tiramisù?{" "}
            <Link href="/register" className="font-semibold text-choc underline underline-offset-4 hover:text-gold">
              Join the loyalty club
            </Link>
          </div>
        </form>
        {!staleId && (
          <div className="mt-8">
            <EmptyState
              title="No card on this device yet"
              text="Once you join, your personal stamp card and QR code will open here automatically."
              action={
                <Link href="/register" className="btn-gold">
                  Join Our Loyalty Club
                </Link>
              }
            />
          </div>
        )}
      </section>
    </div>
  );
}
