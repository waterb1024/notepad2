"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyReportSummary } from "@/lib/types";
import Logo from "./Logo";

const ACCENT = "#266EF1"; // Base Gallery Blue 600
const INK = "#282828"; // Gray 900
const LINE = "#E8E8E8"; // Gray 100 / border opaque
const SUCCESS = "#0E8345"; // Green 600
const DANGER = "#DE1135"; // Red 600

function formatDateLong(unix: number): string {
  const d = new Date(unix * 1000);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

function daysAgo(unix: number): string {
  const diff = Math.floor((Date.now() / 1000 - unix) / 86400);
  if (diff <= 0) return "오늘";
  if (diff === 1) return "어제";
  if (diff < 30) return `${diff}일 전`;
  return `${Math.floor(diff / 7)}주 전`;
}

export default function Dashboard() {
  const [reports, setReports] = useState<WeeklyReportSummary[] | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/reports");
    if (!res.ok) return;
    setReports((await res.json()) as WeeklyReportSummary[]);
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const aggregate = useMemo(() => {
    if (!reports) return null;
    const sorted = [...reports].sort((a, b) => b.report_date.localeCompare(a.report_date));
    const latest = sorted[0] ?? null;
    const previous = sorted[1] ?? null;

    const deltaServices = latest && previous ? latest.serviceCount - previous.serviceCount : null;
    const deltaThemes = latest && previous ? latest.themeCount - previous.themeCount : null;

    function bucket(pick: (r: WeeklyReportSummary) => string[]) {
      const counts = new Map<string, number>();
      for (const r of reports!) {
        for (const t of pick(r)) {
          const key = t.trim();
          if (!key) continue;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count }));
    }

    const themes = bucket((r) => r.themeNames);
    const commonalities = bucket((r) => r.commonalityHeadlines);
    const segments = bucket((r) => r.marketSegmentNames);

    const risingThemes = latest
      ? latest.themeNames
          .map((t) => t.trim())
          .filter((t) => t)
          .filter((t) => !previous || !previous.themeNames.includes(t))
      : [];

    const trend = [...reports]
      .sort((a, b) => a.report_date.localeCompare(b.report_date))
      .map((r) => ({
        date: r.report_date.slice(5),
        서비스: r.serviceCount,
        테마: r.themeCount,
      }));

    return {
      latest,
      previous,
      deltaServices,
      deltaThemes,
      themes,
      commonalities,
      segments,
      risingThemes,
      trend,
      total: reports.length,
      totalServices: reports.reduce((sum, r) => sum + r.serviceCount, 0),
    };
  }, [reports]);

  if (loading || !reports || !aggregate) {
    return <DashboardSkeleton />;
  }

  const rest = reports.slice(1);

  return (
    <main className="min-h-[100dvh]">
      <header className="bg-[color:var(--bg)]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between gap-4">
          <div className="text-neutral-900">
            <Logo size={22} />
          </div>
          <span className="eyebrow" style={{ color: ACCENT }}>
            Weekly Research
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 section-stack">
        {aggregate.latest ? (
          <HeroLatest report={aggregate.latest} />
        ) : (
          <div className="card text-center py-16">
            <div className="text-lg font-semibold text-neutral-900">아직 리포트가 없어요</div>
            <p className="text-sm text-neutral-500 mt-2">
              스케줄된 원격 에이전트가 매주 리포트를 생성합니다.
            </p>
          </div>
        )}

        {aggregate.latest && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DeltaKpi
              label="이번 주 서비스"
              value={aggregate.latest.serviceCount}
              delta={aggregate.deltaServices}
            />
            <DeltaKpi
              label="이번 주 테마"
              value={aggregate.latest.themeCount}
              delta={aggregate.deltaThemes}
            />
            <TextKpi
              label="새로 등장한 테마"
              value={aggregate.risingThemes[0] ?? "—"}
              hint={
                aggregate.risingThemes.length > 1
                  ? `외 ${aggregate.risingThemes.length - 1}개`
                  : undefined
              }
            />
            <TextKpi
              label="누적"
              value={`${aggregate.total}주 · ${aggregate.totalServices} 서비스`}
            />
          </section>
        )}

        <Section title="주간 추이" caption="서비스·테마 수의 시간 흐름">
          <div className="card">
            {aggregate.trend.length >= 2 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart
                  data={aggregate.trend}
                  margin={{ top: 8, right: 24, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 13, fill: INK }}
                    stroke={LINE}
                  />
                  <YAxis
                    yAxisId="services"
                    tick={{ fontSize: 13, fill: INK }}
                    stroke={LINE}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="themes"
                    orientation="right"
                    tick={{ fontSize: 13, fill: INK }}
                    stroke={LINE}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 13,
                      borderRadius: 10,
                      border: "none",
                      boxShadow:
                        "0 10px 30px -8px rgba(15,23,42,0.16), 0 4px 12px -2px rgba(15,23,42,0.08)",
                    }}
                  />
                  <Line
                    yAxisId="services"
                    type="monotone"
                    dataKey="서비스"
                    stroke={ACCENT}
                    strokeWidth={2}
                    dot={{ r: 3, fill: ACCENT }}
                  />
                  <Line
                    yAxisId="themes"
                    type="monotone"
                    dataKey="테마"
                    stroke={INK}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: INK }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty hint="2주 이상 쌓이면 추이가 나타납니다." />
            )}
          </div>
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="반복 테마" caption="자주 등장한 테마">
            <div className="card">
              {aggregate.themes.length > 0 ? (
                <ChipCloud data={aggregate.themes.slice(0, 12)} />
              ) : (
                <Empty hint="아직 없음" />
              )}
            </div>
          </Section>

          <Section title="반복 문제 정의" caption="공통점 headline 빈도 순">
            <div className="card">
              {aggregate.commonalities.length > 0 ? (
                <RankedList data={aggregate.commonalities.slice(0, 6)} />
              ) : (
                <Empty hint="아직 없음" />
              )}
            </div>
          </Section>
        </div>

        <Section title="시장 세그먼트" caption="언급된 시장 (상위 10)">
          <div className="card">
            {aggregate.segments.length > 0 ? (
              <ThemeDistributionChart
                data={aggregate.segments.slice(0, 10).map((s) => ({
                  name: s.label,
                  count: s.count,
                }))}
              />
            ) : (
              <Empty hint="아직 없음" />
            )}
          </div>
        </Section>

        {rest.length > 0 && (
          <Section title="지난 리포트" caption={`${rest.length}주`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((r) => (
                <ReportCardLink key={r.id} r={r} />
              ))}
            </div>
          </Section>
        )}
      </div>
    </main>
  );
}

/* ---- subcomponents ---- */

function HeroLatest({ report: r }: { report: WeeklyReportSummary }) {
  return (
    <Link
      href={`/report/${r.id}`}
      className="hero card-hover block relative overflow-hidden group"
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          background:
            `radial-gradient(circle at 100% 0%, ${ACCENT} 0%, transparent 60%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="pill-accent">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: ACCENT }}
            />
            최신 리포트
          </span>
          <span className="text-xs text-neutral-500 tabular-nums">
            {r.report_date} · {daysAgo(r.created_at)}
          </span>
        </div>
        <h2 className="display text-3xl md:text-4xl text-neutral-900 mt-6">
          {r.topOpportunityTitle
            ? `이번 주 Top Pick: ${r.topOpportunityTitle}`
            : "이번 주의 리서치"}
        </h2>
        {r.collectionSummary && (
          <p className="text-base text-neutral-700 mt-4 leading-relaxed max-w-3xl line-clamp-3">
            {r.collectionSummary}
          </p>
        )}
        <div className="mt-7 flex items-center gap-6 flex-wrap text-sm">
          {r.fastestValidationTitle && (
            <div>
              <div className="text-xs text-neutral-500">가장 빠른 검증</div>
              <div className="font-semibold text-neutral-900 mt-1">
                {r.fastestValidationTitle}
              </div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-4 text-xs text-neutral-500 tabular-nums">
            <span>테마 {r.themeCount}</span>
            <span className="text-neutral-300">·</span>
            <span>서비스 {r.serviceCount}</span>
            <span
              className="ml-2 font-semibold group-hover:translate-x-0.5 transition-transform"
              style={{ color: ACCENT }}
            >
            리포트 보기 →
          </span>
        </div>
        </div>
      </div>
    </Link>
  );
}

function DeltaKpi({
  label,
  value,
  delta,
}: {
  label: string;
  value: number;
  delta: number | null;
}) {
  const arrow = delta == null ? null : delta > 0 ? "▲" : delta < 0 ? "▼" : "—";
  const abs = delta == null ? 0 : Math.abs(delta);
  const positive = (delta ?? 0) > 0;
  const negative = (delta ?? 0) < 0;
  const badgeBg = positive
    ? "#EAF6ED" // Green 50
    : negative
      ? "#FFF0EE" // Red 50
      : "#F3F3F3"; // Gray 50
  const badgeColor = positive ? SUCCESS : negative ? DANGER : "#727272";
  return (
    <div className="card">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="text-3xl font-bold text-neutral-900 headline-tight tabular-nums leading-none">
          {value}
        </span>
        {arrow && (
          <span
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums"
            style={{ background: badgeBg, color: badgeColor }}
          >
            {arrow}
            {abs}
          </span>
        )}
      </div>
      <div className="text-xs text-neutral-400 mt-2">지난 주 대비</div>
    </div>
  );
}

function TextKpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-neutral-900 headline-tight line-clamp-2 leading-snug">
        {value}
      </div>
      {hint && <div className="text-xs text-neutral-400 mt-1">{hint}</div>}
    </div>
  );
}

function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-5 flex-wrap">
        <h2 className="text-xl font-bold text-neutral-900 headline-tight">
          {title}
        </h2>
        {caption && <span className="text-xs text-neutral-500">{caption}</span>}
      </div>
      {children}
    </section>
  );
}

// Base Gallery palette
const THEME_PALETTE = [
  "#0E8345", // Green 600
  "#266EF1", // Blue 600
  "#944DE7", // Purple 600
  "#CA26A5", // Magenta 600
  "#C54600", // Orange 600
  "#007F8C", // Teal 600
  "#4F7F06", // Lime 600
  "#A95F03", // Amber 600
  "#B97502", // Yellow 500
  "#DE1135", // Red 600
];

const THEME_PALETTE_50 = [
  "#EAF6ED", // Green 50
  "#EFF4FE", // Blue 50
  "#F9F1FF", // Purple 50
  "#FEEFF9", // Magenta 50
  "#FFF0E9", // Orange 50
  "#E2F8FB", // Teal 50
  "#EEF6E3", // Lime 50
  "#FFF1E1", // Amber 50
  "#FDF2DC", // Yellow 50
  "#FFF0EE", // Red 50
];

function ChipCloud({ data }: { data: Array<{ label: string; count: number }> }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex flex-wrap gap-2">
      {data.map((d, i) => {
        const weight = d.count / max;
        const fontSize = 14 + weight * 6;
        const idx = i % THEME_PALETTE.length;
        const color = THEME_PALETTE[idx];
        const bg = THEME_PALETTE_50[idx];
        return (
          <span
            key={d.label}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: 1.2,
              background: bg,
              color,
              fontWeight: weight > 0.6 ? 700 : 600,
            }}
          >
            {d.label}
            <span
              className="tabular-nums"
              style={{
                color,
                opacity: 0.65,
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              {d.count}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function ThemeDistributionChart({
  data,
}: {
  data: Array<{ name: string; count: number }>;
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;
  const withColors = data.map((d, i) => ({
    ...d,
    color: THEME_PALETTE[i % THEME_PALETTE.length],
    pct: (d.count / total) * 100,
  }));
  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-neutral-500">누적 {total}회 언급</span>
        <span className="text-xs text-neutral-500 tabular-nums">
          {data.length}개 세그먼트
        </span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-black/[0.04]">
        {withColors.map((d) => (
          <div
            key={d.name}
            title={`${d.name}: ${d.count} (${d.pct.toFixed(1)}%)`}
            style={{ width: `${d.pct}%`, background: d.color }}
            className="transition-opacity hover:opacity-80"
          />
        ))}
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {withColors.map((d) => (
          <li key={d.name} className="flex items-center gap-3">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: d.color }}
            />
            <span className="text-sm text-neutral-800 leading-snug flex-1 min-w-0">
              {d.name}
            </span>
            <span className="text-xs text-neutral-500 tabular-nums shrink-0">
              {d.count}
              <span className="text-neutral-400 ml-1.5">
                {d.pct.toFixed(0)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RankedList({ data }: { data: Array<{ label: string; count: number }> }) {
  return (
    <ol className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label} className="flex gap-3">
          <span
            className="shrink-0 text-xs font-semibold text-neutral-400 tabular-nums mt-0.5"
            style={{ width: "1.5rem" }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
            <span className="text-sm text-neutral-800 leading-relaxed">{d.label}</span>
            <span className="text-xs font-semibold text-neutral-500 tabular-nums shrink-0 mt-0.5">
              ×{d.count}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ReportCardLink({ r }: { r: WeeklyReportSummary }) {
  return (
    <Link href={`/report/${r.id}`} className="card card-hover block group">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold tabular-nums" style={{ color: ACCENT }}>
          {r.report_date}
        </div>
        <div className="text-xs text-neutral-400">{daysAgo(r.created_at)}</div>
      </div>
      <p className="text-sm text-neutral-800 mt-3 leading-relaxed line-clamp-3 min-h-[3.75rem]">
        {r.collectionSummary || "요약 없음"}
      </p>
      {r.topOpportunityTitle && (
        <div
          className="mt-4 -mx-6 px-6 py-3 rounded-lg"
          style={{ background: "var(--bg-alt)" }}
        >
          <div className="text-xs text-neutral-500">Top Pick</div>
          <div className="text-sm font-semibold text-neutral-900 mt-1 leading-snug">
            {r.topOpportunityTitle}
          </div>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
        <span className="tabular-nums">
          테마 {r.themeCount} · 서비스 {r.serviceCount}
        </span>
        <span className="text-neutral-400">{formatDateLong(r.created_at)}</span>
      </div>
    </Link>
  );
}

function Empty({ hint }: { hint: string }) {
  return (
    <div className="h-[180px] grid place-items-center text-xs text-neutral-400">{hint}</div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="min-h-[100dvh]">
      <header className="bg-[color:var(--bg)]/80 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-5">
          <div className="h-3 w-32 bg-black/[0.06] rounded animate-pulse" />
          <div className="h-6 w-56 bg-black/[0.06] rounded animate-pulse mt-3" />
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 section-stack">
        <div className="card" style={{ padding: "32px" }}>
          <div className="h-5 w-24 bg-black/[0.06] rounded animate-pulse" />
          <div className="h-8 w-96 max-w-full bg-black/[0.08] rounded animate-pulse mt-4" />
          <div className="space-y-2 mt-6">
            <div className="h-3 w-full bg-black/[0.05] rounded animate-pulse" />
            <div className="h-3 w-3/4 bg-black/[0.05] rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="h-3 w-20 bg-black/[0.06] rounded animate-pulse" />
              <div className="h-8 w-16 bg-black/[0.08] rounded animate-pulse mt-3" />
            </div>
          ))}
        </div>
        <div className="card">
          <div className="h-[240px] bg-black/[0.04] rounded animate-pulse" />
        </div>
      </div>
    </main>
  );
}
