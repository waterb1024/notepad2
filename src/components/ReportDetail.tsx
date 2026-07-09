"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { WeeklyReport } from "@/lib/types";

type Props = { id: number };

const PIE_PALETTE = ["#059669", "#0891b2", "#7c3aed", "#db2777", "#ea580c", "#65a30d", "#0284c7", "#a16207", "#dc2626", "#4f46e5"];

const RANK_STYLES: Record<number, { bg: string; text: string; border: string; emoji: string }> = {
  1: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300", emoji: "🥇" },
  2: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-300", emoji: "🥈" },
  3: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300", emoji: "🥉" },
};

function tagSize(count: number, max: number): string {
  const ratio = count / Math.max(max, 1);
  if (ratio > 0.75) return "text-base font-semibold";
  if (ratio > 0.5) return "text-sm font-semibold";
  if (ratio > 0.25) return "text-sm";
  return "text-xs";
}

export default function ReportDetail({ id }: Props) {
  const router = useRouter();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/reports/${id}`);
      if (!res.ok) {
        setError(res.status === 404 ? "리포트를 찾을 수 없습니다." : `오류 (${res.status})`);
        return;
      }
      setReport((await res.json()) as WeeklyReport);
    })();
  }, [id]);

  const handleDelete = useCallback(async () => {
    if (!confirm("이 리포트를 삭제할까요?")) return;
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    router.push("/");
  }, [id, router]);

  const categoryData = useMemo(() => {
    if (!report) return [];
    const counts = new Map<string, number>();
    for (const s of report.data.serviceList) {
      const key = s.category?.trim() || "미분류";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [report]);

  const hasRealCategories = useMemo(() => {
    if (!report) return false;
    return report.data.serviceList.some((s) => (s.category?.trim().length ?? 0) > 0);
  }, [report]);

  if (error) {
    return (
      <main className="min-h-screen grid place-items-center bg-neutral-50">
        <div className="text-sm text-neutral-500">
          {error} <Link href="/" className="text-emerald-700 underline ml-2">돌아가기</Link>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen grid place-items-center text-neutral-400 text-sm bg-neutral-50">
        불러오는 중...
      </main>
    );
  }

  const { data } = report;

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← 대시보드
          </Link>
          <button
            onClick={handleDelete}
            className="text-xs text-neutral-400 hover:text-red-500 transition"
          >
            삭제
          </button>
        </div>
      </header>

      <article className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div>
          <div className="text-xs font-medium text-emerald-700">{report.report_date}</div>
          <h1 className="text-2xl font-bold text-neutral-900 mt-1">주간 Product Hunt 리서치</h1>
          {data.collectionSummary && (
            <p className="text-sm text-neutral-600 mt-2">{data.collectionSummary}</p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiSm label="수집 서비스" value={data.serviceList.length} />
          <KpiSm label="공통 테마" value={data.commonalities.length} />
          <KpiSm label="Top 기회" value={data.top5Opportunities.length} />
          <KpiSm label="카테고리" value={categoryData.length} />
        </div>

        <section>
          <SectionTitle title="🚀 1인 개발자용 미개척 상위 5" />
          {data.top5Opportunities.length === 0 ? (
            <EmptyMsg />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.top5Opportunities.map((o) => {
                const style = RANK_STYLES[o.rank] ?? {
                  bg: "bg-neutral-50",
                  text: "text-neutral-700",
                  border: "border-neutral-300",
                  emoji: "🎯",
                };
                return (
                  <div
                    key={o.rank}
                    className={`bg-white border rounded-lg px-5 py-4 hover:shadow-sm transition ${style.border}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${style.bg} ${style.text} text-sm font-bold border ${style.border}`}
                      >
                        {o.rank}
                      </span>
                      <span className="text-sm">{style.emoji}</span>
                      <span className="text-base font-semibold text-neutral-900">{o.title}</span>
                    </div>
                    <p className="text-sm text-neutral-700 mt-3 whitespace-pre-line">
                      <span className="font-semibold text-neutral-500">왜:</span> {o.rationale}
                    </p>
                    <p className="text-sm text-neutral-600 mt-1.5 whitespace-pre-line">
                      <span className="font-semibold text-neutral-500">구현:</span> {o.difficultyNotes}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-neutral-200 rounded-lg px-5 py-4">
            <SectionTitle title="🧩 문제의 공통점" inline />
            {data.commonalities.length === 0 ? (
              <EmptyMsg />
            ) : (
              <div className="flex flex-wrap gap-2 mt-3">
                {data.commonalities.map((c, i) => (
                  <span
                    key={i}
                    className={`inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full px-3 py-1 ${tagSize(1, 1)}`}
                  >
                    #{c}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-neutral-200 rounded-lg px-5 py-4">
            <SectionTitle title="📁 카테고리 분포" inline />
            {categoryData.length === 0 || (!hasRealCategories && categoryData.length === 1) ? (
              <div className="h-[220px] grid place-items-center text-xs text-neutral-400 text-center px-4">
                카테고리 정보가 없어요.
                <br />
                다음 리서치부터 자동 분류됩니다.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <section className="bg-white border border-neutral-200 rounded-lg px-5 py-4">
          <SectionTitle title="📊 시장 규모" inline />
          <p className="text-sm text-neutral-800 mt-2 whitespace-pre-line leading-relaxed">
            {data.marketSize || "—"}
          </p>
        </section>

        <section>
          <SectionTitle title={`🔍 수집된 서비스 (${data.serviceList.length}개)`} />
          {data.serviceList.length === 0 ? (
            <EmptyMsg />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {data.serviceList.map((s, i) => (
                <div
                  key={i}
                  className="bg-white border border-neutral-200 rounded px-4 py-2.5 hover:border-emerald-300 transition"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-sm font-semibold text-neutral-900 truncate">{s.name}</div>
                    {s.category && (
                      <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded shrink-0">
                        {s.category}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">{s.tagline}</div>
                  <div className="text-xs text-neutral-700 mt-1.5">
                    <span className="text-neutral-500">문제:</span> {s.problem}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {data.notes && (
          <section className="bg-neutral-100 border border-neutral-200 rounded-lg px-5 py-4">
            <SectionTitle title="📝 메모" inline />
            <p className="whitespace-pre-line text-xs text-neutral-600 mt-2 leading-relaxed">
              {data.notes}
            </p>
          </section>
        )}
      </article>
    </main>
  );
}

function KpiSm({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg px-4 py-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-bold text-neutral-900 mt-0.5">{value}</div>
    </div>
  );
}

function SectionTitle({ title, inline }: { title: string; inline?: boolean }) {
  return (
    <h2 className={`font-semibold text-neutral-700 ${inline ? "text-xs" : "text-sm mb-3"}`}>
      {title}
    </h2>
  );
}

function EmptyMsg() {
  return <p className="text-sm text-neutral-400">—</p>;
}
