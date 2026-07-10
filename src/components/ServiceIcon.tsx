"use client";

import { useState } from "react";
import type { ThemeService } from "@/lib/types";

function initials(name: string): string {
  const cleaned = name.replace(/[·/].+$/, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Base Gallery 500 shades
const INITIALS_PALETTE = [
  "#009A51", // Green
  "#068BEE", // Blue
  "#A964F7", // Purple
  "#E142BC", // Magenta
  "#E65300", // Orange
  "#0095A4", // Teal
  "#5B9500", // Lime
  "#C46E00", // Amber
  "#F83446", // Red
  "#B97502", // Yellow
];

function bgColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return INITIALS_PALETTE[Math.abs(hash) % INITIALS_PALETTE.length];
}

function resolverUrl(service: ThemeService): string | null {
  const params = new URLSearchParams();
  if (service.productHuntUrl) params.set("ph", service.productHuntUrl);
  if (service.websiteUrl) params.set("web", service.websiteUrl);
  if (service.name) params.set("name", service.name);
  if ([...params.keys()].length === 0) return null;
  return `/api/service-icon?${params.toString()}`;
}

type Props = {
  service: ThemeService;
  size?: number;
  className?: string;
};

export default function ServiceIcon({ service, size = 32, className }: Props) {
  const [step, setStep] = useState<"direct" | "resolver" | "fallback">(
    service.iconUrl ? "direct" : resolverUrl(service) ? "resolver" : "fallback",
  );

  const dim = { width: size, height: size };

  if (step === "direct" && service.iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={service.iconUrl}
        alt={service.name}
        style={dim}
        className={`rounded-md object-cover bg-neutral-100 ${className ?? ""}`}
        onError={() => setStep(resolverUrl(service) ? "resolver" : "fallback")}
      />
    );
  }

  if (step === "resolver") {
    const src = resolverUrl(service);
    if (src) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={service.name}
          style={dim}
          className={`rounded-md object-cover bg-neutral-100 ${className ?? ""}`}
          onError={() => setStep("fallback")}
          loading="lazy"
        />
      );
    }
  }

  return (
    <div
      style={{ ...dim, background: bgColor(service.name) }}
      className={`rounded-md grid place-items-center text-white font-bold ${className ?? ""}`}
    >
      <span style={{ fontSize: Math.max(12, size * 0.4) }}>{initials(service.name)}</span>
    </div>
  );
}
