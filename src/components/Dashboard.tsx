"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyReportSummary } from "@/lib/types";

function formatDate(unix: number): string {
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

const BAR_PALETTE = [
  "#059669",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#65a30d",
  "#0284c7",
  "#a16207",
];

function stars(n: number | null): string {
  if (n == null) return "";
  return "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));
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
    const total = reports.length;
    const lastDate = reports[0]?.report_date ?? null;
    const totalServices = reports.reduce((sum, r) => sum + r.serviceCount, 0);

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

    const trend = [...reports]
      .sort((a, b) => a.report_date.localeCompare(b.report_date))
      .map((r) => ({
        date: r.report_date.slice(5),
        서비스: r.serviceCount,
        테마: r.themeCount,
      }));

    return { total, lastDate, totalServices, themes, commonalities, segments, trend };
  }, [reports]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }, []);

  if (loading || !reports || !aggregate) {
    return (
      <div className="min-h-[100dvh] grid place-items-center text-neutral-400 text-sm">
        불러오는 중...
      </div>
    );
  }

  const hasEnoughForTrend = aggregate.trend.length >= 2;

  return (
    <main className="min-h-[100dvh]">
      <header className="border-b border-black/[0.06] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">🔬 PH Weekly Research</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              매주 자동 갱신되는 Product Hunt 상위 서비스 분석
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-neutral-500 hover:text-neutral-800 transition"
          >
            로그아웃
          </button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Kpi label="총 리포트" value={aggregate.total} />
          <Kpi label="누적 서비스" value={aggregate.totalServices} />
          <Kpi
            label="최신 리포트"
            value={aggregate.lastDate ?? "—"}
            valueClassName="text-lg md:text-xl"
          />
          <Kpi label="추적 테마" value={aggregate.themes.length} hint="누적 고유 개수" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ChartCard title="📈 주간 수집량 추이">
            {hasEnoughForTrend ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={aggregate.trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="서비스"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="테마"
                    stroke="#0891b2"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart hint="2주 이상 쌓이면 트렌드가 보여요." />
            )}
          </ChartCard>

          <ChartCard title="🏆 반복 등장 테마 (상위 8)">
            {aggregate.themes.length > 0 ? (
              <HorizontalBar data={aggregate.themes.slice(0, 8)} />
            ) : (
              <EmptyChart hint="테마가 아직 없어요." />
            )}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <ChartCard title="💡 반복 등장 공통점 (상위 6)">
            {aggregate.commonalities.length > 0 ? (
              <HorizontalBar data={aggregate.commonalities.slice(0, 6)} />
            ) : (
              <EmptyChart hint="공통점이 아직 없어요." />
            )}
          </ChartCard>

          <ChartCard title="📊 언급된 시장 세그먼트 (상위 8)">
            {aggregate.segments.length > 0 ? (
              <HorizontalBar data={aggregate.segments.slice(0, 8)} />
            ) : (
              <EmptyChart hint="세그먼트가 아직 없어요." />
            )}
          </ChartCard>
        </div>

        <h2 className="text-sm font-semibold text-neutral-700 mb-3">리포트</h2>
        {reports.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-neutral-300 px-6 py-12 text-center">
            <p className="text-sm text-neutral-500">
              아직 리포트가 없어요. 매주 스케줄된 원격 에이전트가 리포트를 생성합니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((r) => (
              <Link
                key={r.id}
                href={`/report/${r.id}`}
                className="bg-white rounded-xl border border-black/[0.06] hover:border-black/[0.14] hover:shadow-[0_2px_12px_rgba(23,23,23,0.05)] px-6 py-5 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-emerald-700">{r.report_date}</div>
                  <div className="text-xs text-neutral-400">{daysAgo(r.created_at)}</div>
                </div>
                <p className="text-sm text-neutral-800 mt-2 line-clamp-3">
                  {r.collectionSummary || "요약 없음"}
                </p>
                {r.topOpportunityTitle && (
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="text-neutral-600">🚀 1위 — {r.topOpportunityTitle}</span>
                  </div>
                )}
                {r.topOpportunityStars != null && (
                  <div className="mt-1 text-xs text-amber-600">
                    난이도 <span className="tracking-tight">{stars(r.topOpportunityStars)}</span>
                  </div>
                )}
                {r.themeNames.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.themeNames.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded truncate max-w-[140px]"
                      >
                        {t}
                      </span>
                    ))}
                    {r.themeNames.length > 3 && (
                      <span className="text-xs text-neutral-400">
                        +{r.themeNames.length - 3}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-3 text-xs text-neutral-400 flex justify-between">
                  <span>테마 {r.themeCount} · 서비스 {r.serviceCount}</span>
                  <span>{formatDate(r.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Kpi({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: number | string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-black/[0.06] px-4 py-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`font-bold text-neutral-900 mt-0.5 ${valueClassName ?? "text-2xl"}`}>
        {value}
      </div>
      {hint && <div className="text-xs text-neutral-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-black/[0.06] px-6 py-5">
      <div className="text-xs font-semibold text-neutral-700 mb-3">{title}</div>
      {children}
    </div>
  );
}

function EmptyChart({ hint }: { hint: string }) {
  return (
    <div className="h-[220px] grid place-items-center text-xs text-neutral-400">{hint}</div>
  );
}

function HorizontalBar({ data }: { data: Array<{ label: string; count: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12 }}
          width={140}
          interval={0}
        />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
