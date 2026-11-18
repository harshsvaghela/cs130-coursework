"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT, type ToastTone } from "@/lib/toast";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    let counter = 0;
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; tone: ToastTone }>).detail;
      const id = ++counter;
      setItems((prev) => [...prev.slice(-2), { id, message: detail.message, tone: detail.tone }]);
      window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3600);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[120] flex flex-col items-center gap-2 px-4 md:bottom-8"
      aria-live="polite"
      role="status"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="modal-in flex max-w-md items-center gap-3 rounded-full border border-gold/30 bg-espresso px-5 py-3.5 text-[14px] text-cream shadow-luxe"
        >
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
              item.tone === "error" ? "bg-red-200 text-red-900" : item.tone === "info" ? "bg-ivory text-choc" : "bg-gold text-espresso"
            }`}
          >
            {item.tone === "error" ? "!" : item.tone === "info" ? "i" : "✓"}
          </span>
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
}
