"use client";

import * as QRCode from "qrcode";
import { useEffect, useState } from "react";

/**
 * Renders a QR code for a value (a URL that only contains the public Customer ID).
 * Generated fully in the browser — nothing is sent to a third-party service.
 */
export function QRCodeImage({
  value,
  size = 220,
  className = "",
  alt = "Customer QR code",
}: {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#2A1712", light: "#FFFDF8" },
    })
      .then((url: string) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        className={`grid place-items-center rounded-2xl bg-ivory/70 text-[11px] uppercase tracking-[0.2em] text-muted ${className}`}
        style={{ width: size, height: size }}
      >
        Preparing QR
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={size} height={size} className={`rounded-2xl ${className}`} />;
}
