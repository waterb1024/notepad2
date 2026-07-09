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

function extractDomain(url?: string): string | null {
  if (!url) return null;
  try {
    const withProto = url.startsWith("http") ? url : `https://${url}`;
    return new URL(withProto).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
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

type Props = {
  service: ThemeService;
  size?: number;
  className?: string;
};

export default function ServiceIcon({ service, size = 32, className }: Props) {
  const [errored, setErrored] = useState<{ direct: boolean; favicon: boolean }>({
    direct: false,
    favicon: false,
  });
  const domain = extractDomain(service.websiteUrl);
  const useDirect = !!service.iconUrl && !errored.direct;
  const useFavicon = !useDirect && !!domain && !errored.favicon;

  const dim = { width: size, height: size };

  if (useDirect) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={service.iconUrl}
        alt={service.name}
        style={dim}
        className={`rounded-md object-cover bg-neutral-100 ${className ?? ""}`}
        onError={() => setErrored((e) => ({ ...e, direct: true }))}
      />
    );
  }

  if (useFavicon) {
    const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain!)}&sz=64`;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={service.name}
        style={dim}
        className={`rounded-md object-contain bg-neutral-100 p-0.5 ${className ?? ""}`}
        onError={() => setErrored((e) => ({ ...e, favicon: true }))}
      />
    );
  }

  return (
    <div
      style={dim}
      className={`rounded-md grid place-items-center text-white text-[0.6em] font-bold ${bgColor(service.name)} ${className ?? ""}`}
    >
      <span style={{ fontSize: Math.max(12, size * 0.4) }}>{initials(service.name)}</span>
    </div>
  );
}
