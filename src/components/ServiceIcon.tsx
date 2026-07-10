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

function bgColor(name: string): string {
  const palette = [
    "bg-emerald-500",
    "bg-sky-500",
    "bg-violet-500",
    "bg-pink-500",
    "bg-orange-500",
    "bg-lime-500",
    "bg-cyan-500",
    "bg-amber-500",
    "bg-red-500",
    "bg-indigo-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
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
      style={dim}
      className={`rounded-md grid place-items-center text-white font-bold ${bgColor(service.name)} ${className ?? ""}`}
    >
      <span style={{ fontSize: Math.max(12, size * 0.4) }}>{initials(service.name)}</span>
    </div>
  );
}
