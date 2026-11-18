"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { findCustomerById, getDb, pendingRewardFor, rewardStateFor, searchCustomers, useDb, type Customer } from "@/lib/db";
import { formatMobile, formatNumber } from "@/lib/format";
import { toast } from "@/lib/toast";
import { StampCard } from "@/components/StampCard";
import { StampActionDialog, type StampMode } from "@/components/StampActionDialog";
import { PageTitle, Spinner, StatusBadge } from "@/components/ui";
import { ActivityList } from "@/components/ActivityList";
import { customerHistory } from "@/lib/db";

type CameraState = "off" | "starting" | "on" | "denied" | "unsupported" | "error";
type Banner = { tone: "idle" | "scanning" | "success" | "error"; text: string } | null;

/** Accepts our card URL (?cid=CT-XXXXXX) or a bare Customer ID. Returns the ID or null. */
function parseCustomerPayload(text: string): string | null {
  const raw = text.trim();
  try {
    const url = new URL(raw);
    const cid = url.searchParams.get("cid");
    if (cid && /^CT-[A-Z0-9]{6}$/i.test(cid)) return cid.toUpperCase();
  } catch {
    /* not a URL */
  }
  const match = raw.toUpperCase().match(/CT-[A-Z0-9]{6}/);
  return match ? match[0] : null;
}

export default function ScannerPage() {
  const data = useDb();
  const req = data.settings.stampRequirement;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef(0);
  const decodingRef = useRef(false);
  const decodeHandlerRef = useRef<(text: string) => void>(() => {});

  const [camera, setCamera] = useState<CameraState>("off");
  const [cameraMsg, setCameraMsg] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>({ tone: "idle", text: "Start the camera, upload a QR image, or search manually." });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<StampMode>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const selected = selectedId ? data.customers.find((c) => c.id === selectedId) ?? null : null;
  const selectedState = selected ? rewardStateFor(data, selected) : null;
  const cardFull = !!selected && (selected.currentStamps >= req || !!pendingRewardFor(data, selected.id));

  /* ---------- Decoding ---------- */
  const identify = useCallback((text: string, source: "camera" | "image" | "manual") => {
    const id = parseCustomerPayload(text);
    if (!id) {
      setBanner({ tone: "error", text: "That QR code is not a Casa Tiramisù loyalty card. Try again or search manually." });
      toast("Not a Casa Tiramisù card", "error");
      return;
    }
    const customer = findCustomerById(getDb(), id);
    if (!customer) {
      setBanner({ tone: "error", text: `Card ${id} was not found in this club. It may belong to another device or a reset demo.` });
      toast("Card not recognised", "error");
      return;
    }
    decodingRef.current = false; // pause decoding so the same card is not read twice
    setSelectedId(customer.id);
    setResults(null);
    setBanner({ tone: "success", text: `Card identified (${source === "camera" ? "camera" : source === "image" ? "image" : "search"}). Verify the customer, then confirm the purchase.` });
    toast(`${customer.name.split(" ")[0]}'s card identified`, "success");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(60);
  }, []);

  useEffect(() => {
    decodeHandlerRef.current = (text: string) => identify(text, "camera");
  }, [identify]);

  /* ---------- Camera ---------- */
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    decodingRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamera("off");
  }, []);

  const tick = useCallback((ts: number) => {
    rafRef.current = requestAnimationFrame(tick);
    if (!decodingRef.current) return;
    if (ts - lastTickRef.current < 160) return;
    lastTickRef.current = ts;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return;
    const scale = Math.min(1, 720 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
    if (code?.data) decodeHandlerRef.current(code.data);
  }, []);

  const startCamera = async () => {
    if (typeof window !== "undefined" && (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)) {
      setCamera("unsupported");
      setCameraMsg("Camera scanning needs a secure connection (HTTPS or localhost) and a modern browser. Use the image upload or manual search below.");
      return;
    }
    setCamera("starting");
    setCameraMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element unavailable");
      video.srcObject = stream;
      await video.play();
      setCamera("on");
      decodingRef.current = true;
      setBanner({ tone: "scanning", text: "Point the camera at the customer's QR code." });
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const name = (err as { name?: string })?.name ?? "";
      setCamera(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
      const message =
        name === "NotAllowedError" || name === "SecurityError"
          ? "Camera permission was denied. Allow camera access for this site in your browser settings, then tap Try again."
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "No camera was found on this device. Use the image upload or manual search."
            : name === "NotReadableError"
              ? "The camera is busy in another app. Close it and try again."
              : "The camera could not be started. Try again, or use the manual search.";
      setCameraMsg(message);
      setBanner({ tone: "error", text: message });
      toast("Camera unavailable", "error");
    }
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const resumeScanning = () => {
    setSelectedId(null);
    setBanner(
      camera === "on" ? { tone: "scanning", text: "Ready for the next customer." } : { tone: "idle", text: "Start the camera or search manually." },
    );
    if (camera === "on") decodingRef.current = true;
  };

  /* ---------- Image upload ---------- */
  const onImage = async (file: File) => {
    setUploading(true);
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "attemptBoth" });
      URL.revokeObjectURL(url);
      if (code?.data) identify(code.data, "image");
      else {
        setBanner({ tone: "error", text: "No QR code was found in that image. Try a sharper photo or search manually." });
        toast("No QR code found in image", "error");
      }
    } catch {
      setBanner({ tone: "error", text: "That file could not be read. Please choose a PNG or JPG image." });
    } finally {
      setUploading(false);
    }
  };

  /* ---------- Manual search ---------- */
  const search = (e: FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    const q = query.trim();
    if (!q) {
      setSearchError("Enter a mobile number, Customer ID or name.");
      return;
    }
    const matches = searchCustomers(data, q);
    setResults(matches);
    if (matches.length === 0) setSearchError("No member matches that search. Check the number or ask the customer to show their card.");
    if (matches.length === 1) identify(matches[0].id, "manual");
  };

  return (
    <div className="space-y-8">
      <PageTitle
        eyebrow="Cashier mode"
        title="QR scanner"
        description="Scan the customer's card, verify the profile, then confirm the purchase. Scanning alone never adds a stamp."
      />

      {/* Cashier steps */}
      <ol className="grid grid-cols-3 gap-2 md:max-w-2xl" aria-label="Cashier workflow">
        {["Scan QR", "Verify profile", "Confirm stamp"].map((label, i) => {
          const activeIndex = mode === "award" ? 2 : selected ? 1 : 0;
          const done = i < activeIndex;
          const current = i === activeIndex;
          return (
            <li key={label} className={`rounded-2xl border px-4 py-3 transition ${current ? "border-gold bg-espresso text-gold" : done ? "border-gold/40 bg-gold/15 text-choc" : "border-espresso/10 bg-white/50 text-muted"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">Step {i + 1}</p>
              <p className="mt-1 text-[13px] font-semibold">{label}</p>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-8 xl:grid-cols-12">
        {/* Camera */}
        <section className="space-y-5 xl:col-span-7">
          <div className="relative overflow-hidden rounded-[32px] bg-dark shadow-luxe ring-1 ring-gold/25">
            <div className="relative aspect-[3/4] w-full sm:aspect-[4/3] xl:aspect-video">
              <video ref={videoRef} playsInline muted className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${camera === "on" ? "opacity-100" : "opacity-0"}`} aria-label="Live camera preview" />
              <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

              {camera === "on" && (
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-0 bg-dark/35" style={{ maskImage: "radial-gradient(circle at 50% 50%, transparent 0 34%, black 36%)", WebkitMaskImage: "radial-gradient(circle at 50% 50%, transparent 0 34%, black 36%)" }} />
                  <div className="absolute left-1/2 top-1/2 h-[62%] w-[70%] -translate-x-1/2 -translate-y-1/2">
                    <span className="scan-corner tl" />
                    <span className="scan-corner tr" />
                    <span className="scan-corner bl" />
                    <span className="scan-corner br" />
                    {decodingRef.current && <span className="scan-line" />}
                  </div>
                </div>
              )}

              {camera !== "on" && (
                <div className="absolute inset-0 grid place-items-center p-8 text-center">
                  <div>
                    <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full border border-gold/40 text-gold">
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3.5 8V5.5a2 2 0 0 1 2-2H8M16 3.5h2.5a2 2 0 0 1 2 2V8M20.5 16v2.5a2 2 0 0 1-2 2H16M8 20.5H5.5a2 2 0 0 1-2-2V16" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </div>
                    <p className="font-serif text-[24px] text-cream">{camera === "starting" ? "Opening camera…" : "Camera is off"}</p>
                    <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-muted">
                      {cameraMsg || "Tap Start camera and allow access when your browser asks. Your camera is used only to read QR codes."}
                    </p>
                  </div>
                </div>
              )}

              {/* Status banner */}
              {banner && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`absolute inset-x-4 top-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-[13px] shadow-soft backdrop-blur ${
                    banner.tone === "success"
                      ? "bg-gold text-espresso"
                      : banner.tone === "error"
                        ? "bg-red-100/95 text-red-950"
                        : "bg-espresso/90 text-cream"
                  }`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${banner.tone === "success" ? "bg-espresso text-gold" : banner.tone === "error" ? "bg-red-900 text-red-50" : "bg-gold text-espresso"}`}>
                    {banner.tone === "success" ? "✓" : banner.tone === "error" ? "!" : banner.tone === "scanning" ? "◎" : "i"}
                  </span>
                  <span className="leading-snug">{banner.text}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {camera === "on" ? (
              <button className="btn-ghost w-full" onClick={stopCamera}>
                Stop camera
              </button>
            ) : (
              <button className="btn-espresso w-full" onClick={startCamera} disabled={camera === "starting"}>
                {camera === "starting" ? <Spinner /> : null}
                {camera === "denied" || camera === "error" ? "Try again" : "Start camera"}
              </button>
            )}
            <label className="btn-ghost w-full cursor-pointer">
              {uploading ? <Spinner /> : null} Upload QR image
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImage(f);
                  e.target.value = "";
                }}
              />
            </label>
            <button className="btn-ghost w-full" onClick={resumeScanning} disabled={!selected && camera !== "on"}>
              Scan next customer
            </button>
          </div>

          {(camera === "denied" || camera === "unsupported") && (
            <div className="card-luxe p-5 text-[13px] leading-relaxed text-choc/80">
              <p className="font-semibold text-espresso">Camera permission help</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Chrome / Edge: click the lock icon in the address bar → Site settings → Camera → Allow.</li>
                <li>Safari (iPhone): Settings → Safari → Camera → Allow, then reload.</li>
                <li>The page must be opened on https:// or http://localhost for camera access.</li>
              </ul>
            </div>
          )}
        </section>

        {/* Right column: verification + manual search */}
        <aside className="space-y-6 xl:col-span-5">
          {selected && selectedState ? (
            <section className="reveal space-y-5">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Verified customer</p>
                <StatusBadge state={selectedState} />
              </div>
              <StampCard
                customer={selected}
                stampRequirement={req}
                rewardName={data.settings.rewardName}
                rewardState={selectedState}
                compact
                showQR={false}
              />
              <div className="card-luxe space-y-3 p-5 text-[14px]">
                <div className="flex justify-between gap-4"><span className="text-muted">Mobile</span><span className="font-medium text-espresso">{formatMobile(selected.mobile)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted">Customer ID</span><span className="font-mono text-[13px] text-espresso">{selected.id}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted">Stamps this cycle</span><span className="font-medium text-espresso">{selected.currentStamps} / {req}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted">Lifetime stamps</span><span className="font-medium text-espresso">{formatNumber(selected.lifetimeStamps)}</span></div>
              </div>
              <div className="space-y-3">
                <button className="btn-gold w-full" onClick={() => setMode("award")} disabled={cardFull}>
                  Confirm purchase &amp; award 1 stamp
                </button>
                {cardFull && (
                  <p className="rounded-2xl bg-gold/15 px-4 py-3 text-[13px] text-choc">
                    {selectedState === "UNLOCKED" ? "This reward is ready. Redeem it at the Rewards desk first." : "This card is complete for this cycle."}
                  </p>
                )}
                <p className="text-center text-[12px] text-muted">Only confirm after the customer's purchase is paid for.</p>
              </div>
              <details className="card-luxe p-5">
                <summary className="cursor-pointer text-[13px] font-semibold uppercase tracking-[0.16em] text-choc">Recent history</summary>
                <div className="mt-4">
                  <ActivityList txns={customerHistory(data, selected.id)} limit={5} showStaff />
                </div>
              </details>
            </section>
          ) : (
            <section className="card-luxe reveal p-7">
              <p className="eyebrow mb-3">Waiting for a card</p>
              <h2 className="display text-[30px] leading-tight text-espresso">Verify before you stamp.</h2>
              <p className="mt-4 text-[14px] leading-relaxed text-choc/75">
                Once a card is read, the customer's name, ID and progress appear here. You then confirm the purchase — a stamp is never awarded automatically.
              </p>
            </section>
          )}

          <section className="card-luxe p-6">
            <p className="eyebrow mb-2">Manual lookup</p>
            <h3 className="display mb-4 text-[24px] text-espresso">Can't scan? Search instead.</h3>
            <form onSubmit={search} noValidate className="space-y-3">
              <label htmlFor="manual" className="sr-only">Mobile number, Customer ID or name</label>
              <input
                id="manual"
                className={`field ${searchError ? "field-invalid" : ""}`}
                placeholder="Mobile, Customer ID or name"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                aria-invalid={!!searchError}
              />
              {searchError && <p role="alert" className="text-[13px] text-red-800">{searchError}</p>}
              <button className="btn-espresso w-full" type="submit">
                Find member
              </button>
            </form>
            {results && results.length > 1 && (
              <ul className="mt-5 space-y-2">
                {results.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <button onClick={() => identify(c.id, "manual")} className="flex w-full items-center justify-between rounded-2xl border border-espresso/10 bg-white/60 px-4 py-3 text-left transition hover:border-gold">
                      <span>
                        <span className="block font-medium text-espresso">{c.name}</span>
                        <span className="text-[12px] text-muted">{formatMobile(c.mobile)} · {c.id}</span>
                      </span>
                      <span className="text-[12px] font-semibold text-choc">{c.currentStamps}/{req}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <StampActionDialog
        mode={mode}
        customer={selected}
        onClose={() => {
          setMode(null);
        }}
      />
    </div>
  );
}
