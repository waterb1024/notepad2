"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  LabelList,
} from "recharts";
import type { MarketSegment, ThemeService, WeeklyReport } from "@/lib/types";
import ServiceIcon from "./ServiceIcon";

type Props = { id: number };

type ServiceRow = ThemeService & { themeName: string };

const THEME_PALETTE = [
  "#059669",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#65a30d",
  "#0284c7",
  "#a16207",
];

function parseMarketNumber(v: string): number | null {
  if (!v) return null;
  const cleaned = v.replace(/[\$,]/g, "").trim();
  const range = cleaned.match(/([\d.]+)\s*[~-]\s*([\d.]+)/);
  if (range) {
    const lo = parseFloat(range[1]);
    const hi = parseFloat(range[2]);
    if (Number.isFinite(lo) && Number.isFinite(hi)) return (lo + hi) / 2;
  }
  const one = cleaned.match(/([\d.]+)/);
  if (one) {
    const n = parseFloat(one[1]);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function biggestMarketLabel(segs: MarketSegment[]): { name: string; value: string } | null {
  let bestVal = -1;
  let best: { name: string; value: string } | null = null;
  for (const s of segs) {
    const n = parseMarketNumber(s.size2030);
    if (n != null && n > bestVal) {
      bestVal = n;
      best = { name: s.name, value: s.size2030 };
    }
  }
  return best;
}

function Stars({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <span className="text-amber-500 tracking-tight">
      {"★".repeat(count)}
      <span className="text-neutral-300">{"★".repeat(Math.max(0, max - count))}</span>
    </span>
  );
}

const RANK_BADGE: Record<number, { emoji: string; bg: string }> = {
  1: { emoji: "🥇", bg: "bg-amber-500" },
  2: { emoji: "🥈", bg: "bg-slate-500" },
  3: { emoji: "🥉", bg: "bg-orange-500" },
  4: { emoji: "🎯", bg: "bg-neutral-500" },
  5: { emoji: "🎯", bg: "bg-neutral-500" },
};

export default function ReportDetail({ id }: Props) {
  const router = useRouter();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [themeFilter, setThemeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"upvotes" | "name" | "theme">("upvotes");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  const allServices = useMemo<ServiceRow[]>(() => {
    if (!report) return [];
    return report.data.themes.flatMap((t) =>
      t.services.map((s) => ({ ...s, themeName: t.name })),
    );
  }, [report]);

  const filteredServices = useMemo(() => {
    let list = allServices;
    if (themeFilter !== "all") {
      list = list.filter((s) => s.themeName === themeFilter);
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "upvotes") cmp = (b.upvotes ?? -1) - (a.upvotes ?? -1);
      else if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "theme") cmp = a.themeName.localeCompare(b.themeName);
      return sortDir === "desc" ? cmp : -cmp;
    });
  }, [allServices, themeFilter, sortBy, sortDir]);

  const themeDistribution = useMemo(() => {
    if (!report) return [];
    return report.data.themes.map((t) => ({
      name: t.name,
      count: t.services.length,
    }));
  }, [report]);

  const marketChartData = useMemo(() => {
    if (!report) return [];
    return report.data.marketSize.segments
      .map((s) => ({
        name: s.name,
        "2024": parseMarketNumber(s.size2024) ?? 0,
        "2030": parseMarketNumber(s.size2030) ?? 0,
        cagr: s.cagr ?? "",
        raw2024: s.size2024,
        raw2030: s.size2030,
      }))
      .filter((s) => s["2030"] > 0);
  }, [report]);

  const scatterData = useMemo(() => {
    if (!report) return [];
    return report.data.top5Opportunities.map((o) => ({
      rank: o.rank,
      title: o.title,
      difficulty: o.difficultyStars,
      opportunity: o.opportunityScore,
    }));
  }, [report]);

  if (error) {
    return (
      <main className="min-h-[100dvh] grid place-items-center">
        <div className="text-sm text-neutral-500">
          {error} <Link href="/" className="text-emerald-700 underline ml-2">돌아가기</Link>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-[100dvh] grid place-items-center text-neutral-400 text-sm">
        불러오는 중...
      </main>
    );
  }

  const { data } = report;
  const biggestMarket = biggestMarketLabel(data.marketSize.segments);
  const fastest = data.fastestValidation
    ? data.top5Opportunities.find((o) => o.rank === data.fastestValidation!.targetRank)
    : null;

  return (
    <main className="min-h-[100dvh]">
      <header className="border-b border-black/[0.06] bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← 대시보드
          </Link>
          <div className="text-xs text-neutral-500">{report.report_date}</div>
          <button
            onClick={handleDelete}
            className="text-xs text-neutral-400 hover:text-red-500 transition"
          >
            삭제
          </button>
        </div>
      </header>

      <article className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div>
          <div className="text-xs font-medium text-emerald-700">{report.report_date}</div>
          <h1 className="text-2xl font-bold text-neutral-900 mt-1">주간 Product Hunt 리서치</h1>
          {data.collectionSummary && (
            <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
              {data.collectionSummary}
            </p>
          )}
        </div>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="표본 수 (서비스)" value={allServices.length} />
          <Kpi label="지배적 테마" value={data.themes.length} />
          <Kpi label="Top 아이템" value={data.top5Opportunities.length} />
          <Kpi
            label="가장 큰 시장 (2030)"
            value={biggestMarket?.value ?? "—"}
            hint={biggestMarket?.name}
            valueClassName="text-xl"
          />
        </section>

        {fastest && data.fastestValidation && (
          <section className="bg-emerald-50/60 border border-emerald-200 rounded-xl px-6 py-5">
            <div className="eyebrow text-emerald-700">🚀 가장 빠른 검증 경로</div>
            <div className="mt-2">
              <span className="text-lg font-semibold text-neutral-900">
                {fastest.rank}위 — {fastest.title}
              </span>
              <p className="text-sm text-neutral-700 mt-2 leading-relaxed">
                {data.fastestValidation.rationale}
              </p>
            </div>
          </section>
        )}

        <section>
          <SectionTitle title="1. 테마 분포" caption="어디에 런칭이 몰리는지 — 경쟁 밀집도" />
          {themeDistribution.length === 0 ? (
            <EmptyMsg />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={themeDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {themeDistribution.map((_, i) => (
                        <Cell key={i} fill={THEME_PALETTE[i % THEME_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={themeDistribution}
                    layout="vertical"
                    margin={{ top: 4, right: 30, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      width={140}
                      interval={0}
                    />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {themeDistribution.map((_, i) => (
                        <Cell key={i} fill={THEME_PALETTE[i % THEME_PALETTE.length]} />
                      ))}
                      <LabelList dataKey="count" position="right" style={{ fontSize: 12 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}
        </section>

        <section>
          <SectionTitle
            title={`2. 서비스 테이블 (${filteredServices.length}/${allServices.length})`}
            caption="테마별 필터 · 컬럼 클릭으로 정렬"
          />
          <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden">
            <div className="border-b border-black/[0.06] px-4 py-3 bg-black/[0.02] flex items-center gap-3 flex-wrap">
              <div className="text-xs text-neutral-500">테마 필터:</div>
              <select
                value={themeFilter}
                onChange={(e) => setThemeFilter(e.target.value)}
                className="text-xs border border-neutral-300 rounded px-2 py-1 bg-white"
              >
                <option value="all">전체 ({allServices.length})</option>
                {data.themes.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} ({t.services.length})
                  </option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-black/[0.02] text-neutral-500 text-xs">
                  <tr>
                    <Th
                      label="이름"
                      active={sortBy === "name"}
                      dir={sortDir}
                      onClick={() => toggleSort("name", sortBy, sortDir, setSortBy, setSortDir)}
                    />
                    <th className="text-left px-4 py-2 font-medium">한 줄 설명</th>
                    <Th
                      label="테마"
                      active={sortBy === "theme"}
                      dir={sortDir}
                      onClick={() => toggleSort("theme", sortBy, sortDir, setSortBy, setSortDir)}
                    />
                    <Th
                      label="Upvotes"
                      active={sortBy === "upvotes"}
                      dir={sortDir}
                      onClick={() =>
                        toggleSort("upvotes", sortBy, sortDir, setSortBy, setSortDir)
                      }
                      align="right"
                    />
                    <th className="text-left px-4 py-2 font-medium">링크</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredServices.map((s, i) => (
                    <tr key={`${s.name}-${i}`} className="hover:bg-black/[0.02]">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <ServiceIcon service={s} size={20} />
                          <span className="font-medium text-neutral-900">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-neutral-600 text-xs">{s.tag || "—"}</td>
                      <td className="px-4 py-2 text-xs">
                        <span className="inline-block bg-neutral-100 text-neutral-700 rounded px-1.5 py-0.5">
                          {s.themeName}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-neutral-700">
                        {s.upvotes != null ? s.upvotes.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {s.productHuntUrl ? (
                          <a
                            href={s.productHuntUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:text-orange-700 hover:underline"
                          >
                            PH ↗
                          </a>
                        ) : s.websiteUrl ? (
                          <a
                            href={s.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-500 hover:text-neutral-800 hover:underline"
                          >
                            Web ↗
                          </a>
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredServices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-xs text-neutral-400">
                        해당 테마에 서비스가 없어요.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          <SectionTitle title="3. 문제의 공통점" />
          {data.commonalities.length === 0 ? (
            <EmptyMsg />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.commonalities.map((c) => (
                <div
                  key={c.order}
                  className="bg-white border border-black/[0.06] rounded-xl px-6 py-5"
                >
                  <div className="w-8 h-8 grid place-items-center bg-emerald-600 text-white text-sm font-bold rounded-full">
                    {c.order}
                  </div>
                  <div className="text-sm font-semibold text-neutral-900 mt-3">
                    {c.headline}
                  </div>
                  <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                    {c.elaboration}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle
            title="4. 시장 규모 비교"
            caption="2024 → 2030 규모, 방향성 참고용 (업계 리포트 기반)"
          />
          {marketChartData.length > 0 ? (
            <ChartCard>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={marketChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 30, left: 100, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    label={{
                      value: "$B",
                      position: "insideBottomRight",
                      offset: -4,
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={140}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(_, __, item) => {
                      const p = item.payload as {
                        raw2024: string;
                        raw2030: string;
                        cagr?: string;
                      };
                      return [
                        `${p.raw2024} → ${p.raw2030}${p.cagr ? ` (CAGR ${p.cagr})` : ""}`,
                        "규모",
                      ];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="2024" fill="#94a3b8" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="2030" fill="#059669" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : (
            <div className="bg-white border border-black/[0.06] rounded-xl px-6 py-5 text-sm text-neutral-500">
              시장 규모 세그먼트 데이터 없음
            </div>
          )}
          {data.marketSize.koreaContext && (
            <div className="mt-4 bg-amber-50/60 border border-amber-200 rounded-xl px-6 py-5">
              <div className="eyebrow text-amber-800">🇰🇷 한국 맥락</div>
              <p className="text-sm text-neutral-800 mt-2 leading-relaxed">
                {data.marketSize.koreaContext}
              </p>
            </div>
          )}
        </section>

        <section>
          <SectionTitle
            title="5. 1인 개발자용 미개척 Top 5"
            caption="난이도 × 기회 산점도로 상대 위치를 시각화 — 좌상단이 스위트 스팟"
          />
          {data.top5Opportunities.length === 0 ? (
            <EmptyMsg />
          ) : (
            <div className="space-y-4">
              <ChartCard>
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      type="number"
                      dataKey="difficulty"
                      name="난이도"
                      domain={[0.5, 5.5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tick={{ fontSize: 12 }}
                      label={{
                        value: "난이도 (별점) →",
                        position: "insideBottom",
                        offset: -18,
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="opportunity"
                      name="기회"
                      domain={[0, 10]}
                      ticks={[0, 2, 4, 6, 8, 10]}
                      tick={{ fontSize: 12 }}
                      label={{
                        value: "↑ 기회 점수",
                        angle: -90,
                        position: "insideLeft",
                        fontSize: 12,
                      }}
                    />
                    <ZAxis range={[220, 220]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{ fontSize: 12 }}
                      formatter={(v, name) => [String(v), name === "difficulty" ? "난이도" : "기회"]}
                      labelFormatter={() => ""}
                    />
                    <Scatter data={scatterData}>
                      {scatterData.map((d) => (
                        <Cell
                          key={d.rank}
                          fill={
                            d.rank === 1
                              ? "#f59e0b"
                              : d.rank === 2
                                ? "#64748b"
                                : d.rank === 3
                                  ? "#f97316"
                                  : "#a3a3a3"
                          }
                        />
                      ))}
                      <LabelList
                        dataKey="rank"
                        position="top"
                        style={{ fontSize: 12, fontWeight: "bold" }}
                      />
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </ChartCard>

              <div className="space-y-3">
                {data.top5Opportunities
                  .slice()
                  .sort((a, b) => a.rank - b.rank)
                  .map((o) => {
                    const badge = RANK_BADGE[o.rank] ?? RANK_BADGE[5];
                    return (
                      <div
                        key={o.rank}
                        className="bg-white border border-black/[0.06] rounded-xl px-6 py-5 hover:border-black/[0.14] hover:shadow-[0_2px_12px_rgba(23,23,23,0.05)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-sm font-bold ${badge.bg}`}
                            >
                              {o.rank}
                            </span>
                            <span className="text-lg">{badge.emoji}</span>
                            <span className="text-lg font-bold text-neutral-900">{o.title}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-neutral-500">난이도</span>
                              <Stars count={o.difficultyStars} />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-neutral-500">기회</span>
                              <span className="font-semibold text-emerald-700">
                                {o.opportunityScore}/10
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                          <div className="bg-black/[0.02] border border-black/[0.06] rounded-lg px-3.5 py-3">
                            <div className="eyebrow text-sky-700">📈 올라탄 트렌드</div>
                            <p className="text-sm text-neutral-800 mt-1.5 leading-relaxed">
                              {o.ridingTrend || "—"}
                            </p>
                          </div>
                          <div className="bg-black/[0.02] border border-black/[0.06] rounded-lg px-3.5 py-3">
                            <div className="eyebrow text-red-700">🇰🇷 한국 공백 포인트</div>
                            <p className="text-sm text-neutral-800 mt-1.5 leading-relaxed">
                              {o.koreaGap || "—"}
                            </p>
                          </div>
                        </div>
                        {o.description && (
                          <p className="text-xs text-neutral-600 mt-3 leading-relaxed">
                            {o.description}
                          </p>
                        )}
                        {o.relatedServices && o.relatedServices.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-neutral-500">관련:</span>
                            {o.relatedServices.map((s) => (
                              <span
                                key={s}
                                className="text-xs bg-neutral-100 border border-black/[0.06] text-neutral-700 px-1.5 py-0.5 rounded"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>

        {data.notes && (
          <section className="bg-neutral-100 border border-black/[0.06] rounded-xl px-6 py-5">
            <div className="text-xs font-semibold text-neutral-700">📝 메모</div>
            <p className="whitespace-pre-line text-xs text-neutral-600 mt-2 leading-relaxed">
              {data.notes}
            </p>
          </section>
        )}
      </article>
    </main>
  );
}

function toggleSort(
  next: "upvotes" | "name" | "theme",
  current: "upvotes" | "name" | "theme",
  currentDir: "asc" | "desc",
  setSort: (s: "upvotes" | "name" | "theme") => void,
  setDir: (d: "asc" | "desc") => void,
) {
  if (next === current) {
    setDir(currentDir === "asc" ? "desc" : "asc");
  } else {
    setSort(next);
    setDir(next === "upvotes" ? "desc" : "asc");
  }
}

function Th({
  label,
  active,
  dir,
  onClick,
  align,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "right";
}) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-2 font-medium cursor-pointer select-none hover:text-neutral-800 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {label}
      {active && <span className="ml-1 text-neutral-400">{dir === "desc" ? "▼" : "▲"}</span>}
    </th>
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
    <div className="bg-white border border-black/[0.06] rounded-xl px-4 py-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`font-bold text-neutral-900 mt-0.5 ${valueClassName ?? "text-2xl"}`}>
        {value}
      </div>
      {hint && <div className="text-xs text-neutral-400 mt-0.5 truncate">{hint}</div>}
    </div>
  );
}

function SectionTitle({ title, caption }: { title: string; caption?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      {caption && <p className="text-xs text-neutral-500 mt-0.5">{caption}</p>}
    </div>
  );
}

function ChartCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-black/[0.06] px-6 py-5">{children}</div>
  );
}

function EmptyMsg() {
  return <p className="text-sm text-neutral-400">—</p>;
}
