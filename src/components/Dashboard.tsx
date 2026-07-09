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

const BAR_PALETTE = ["#059669", "#0891b2", "#7c3aed", "#db2777", "#ea580c", "#65a30d", "#0284c7", "#a16207"];

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

    const themeCounts = new Map<string, number>();
    for (const r of reports) {
      for (const t of r.allCommonalities) {
        const key = t.trim();
        if (!key) continue;
        themeCounts.set(key, (themeCounts.get(key) ?? 0) + 1);
      }
    }
    const themesRanked = [...themeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([theme, count]) => ({ theme, count }));

    const trend = [...reports]
      .sort((a, b) => a.report_date.localeCompare(b.report_date))
      .map((r) => ({
        date: r.report_date.slice(5),
        서비스: r.serviceCount,
        테마: r.allCommonalities.length,
      }));

    return {
      total,
      lastDate,
      totalServices,
      topThemes: themesRanked.slice(0, 8),
      themesRanked,
      trend,
    };
  }, [reports]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }, []);

  if (loading || !reports || !aggregate) {
    return (
      <div className="min-h-screen grid place-items-center text-neutral-400 text-sm bg-neutral-50">
        불러오는 중...
      </div>
    );
  }

  const hasEnoughForTrend = aggregate.trend.length >= 2;

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
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
          <Kpi
            label="추적 중인 테마"
            value={aggregate.themesRanked.length}
            hint="누적 고유 개수"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <ChartCard title="📈 주간 수집량 추이">
            {hasEnoughForTrend ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={aggregate.trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
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
            {aggregate.topThemes.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={aggregate.topThemes}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="theme"
                    tick={{ fontSize: 11 }}
                    width={110}
                  />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {aggregate.topThemes.map((_, i) => (
                      <Cell key={i} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart hint="테마가 아직 수집되지 않았어요." />
            )}
          </ChartCard>
        </div>

        <h2 className="text-sm font-semibold text-neutral-700 mb-3">리포트</h2>
        {reports.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed border-neutral-300 px-6 py-12 text-center">
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
                className="bg-white rounded-lg border border-neutral-200 hover:border-emerald-400 hover:shadow-sm px-5 py-4 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-emerald-700">{r.report_date}</div>
                  <div className="text-[11px] text-neutral-400">{daysAgo(r.created_at)}</div>
                </div>
                <p className="text-sm text-neutral-800 mt-2 line-clamp-3">
                  {r.collectionSummary || "요약 없음"}
                </p>
                {r.topOpportunityTitle && (
                  <div className="mt-3 text-xs text-neutral-600">
                    🚀 1위 — {r.topOpportunityTitle}
                  </div>
                )}
                {r.topThemes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.topThemes.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 text-[10px] text-neutral-400 flex justify-between">
                  <span>수집 {r.serviceCount}개</span>
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
    <div className="bg-white rounded-lg border border-neutral-200 px-4 py-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`font-bold text-neutral-900 mt-0.5 ${valueClassName ?? "text-2xl"}`}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-neutral-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 px-5 py-4">
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
