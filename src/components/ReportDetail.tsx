"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MarketSegment, ThemeService, WeeklyReport } from "@/lib/types";
import ServiceIcon from "./ServiceIcon";

type Props = { id: number };

type ServiceRow = ThemeService & { themeName: string };

const ACCENT = "#266EF1"; // Base Gallery Blue 600
const ACCENT_SOFT = "#DEE9FE"; // Blue 100 — visible tint against slate page bg
const INK = "#282828"; // Gray 900
const MUTED = "#5E5E5E"; // Gray 700
const FAINT = "#A6A6A6"; // Gray 400
const LINE = "#E8E8E8"; // Gray 100 / border opaque
const SUCCESS = "#0E8345"; // Green 600

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

type ScatterDotProps = {
  cx?: number;
  cy?: number;
  fill?: string;
  payload?: { rank: number };
};

function RankedDot(props: ScatterDotProps) {
  const { cx, cy, fill, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={16}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={2.5}
      />
      <text
        x={cx}
        y={cy}
        dy=".33em"
        textAnchor="middle"
        fill="#ffffff"
        fontSize={13}
        fontWeight={700}
        style={{ pointerEvents: "none" }}
      >
        {payload.rank}
      </text>
    </g>
  );
}

function ScoreDots({ value, max = 5, tone = "accent" }: { value: number; max?: number; tone?: "accent" | "ink" }) {
  const color = tone === "accent" ? ACCENT : INK;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value}/${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: i < value ? color : LINE }}
        />
      ))}
    </span>
  );
}

export default function ReportDetail({ id }: Props) {
  const router = useRouter();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [themeFilter, setThemeFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"upvotes" | "name" | "theme">("upvotes");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/reports/${id}`);
      if (!res.ok) {
        setError(res.status === 404 ? "리포트를 찾을 수 없습니다." : `오류 (${res.status})`);
        return;
      }
      const parsed = (await res.json()) as WeeklyReport;
      setReport(parsed);
      const firstTheme = parsed.data.themes[0]?.name ?? null;
      setThemeFilter(firstTheme);
    })();
  }, [id]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  const handleDelete = useCallback(async () => {
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
    if (themeFilter) list = list.filter((s) => s.themeName === themeFilter);
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
    return report.data.themes
      .map((t) => ({ name: t.name, count: t.services.length }))
      .sort((a, b) => b.count - a.count);
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
          {error}{" "}
          <Link href="/" className="ml-2 underline" style={{ color: ACCENT }}>
            돌아가기
          </Link>
        </div>
      </main>
    );
  }

  if (!report) {
    return <ReportDetailSkeleton />;
  }

  const { data } = report;
  const biggestMarket = biggestMarketLabel(data.marketSize.segments);
  const fastest = data.fastestValidation
    ? data.top5Opportunities.find((o) => o.rank === data.fastestValidation!.targetRank)
    : null;

  return (
    <main className="min-h-[100dvh]">
      <header className="bg-[color:var(--bg)]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-8 h-8 -ml-1 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-black/[0.04] transition-colors"
            aria-label="대시보드로 돌아가기"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="더보기"
              className="w-7 h-7 grid place-items-center rounded-lg text-neutral-500 hover:bg-black/[0.05] hover:text-neutral-900 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-40 rounded-lg bg-white overflow-hidden z-20"
                style={{ boxShadow: "var(--shadow-pop)" }}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirming(true);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  리포트 삭제
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {confirming && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl mx-4">
            <div className="text-lg font-semibold text-neutral-900 headline-tight">
              이 리포트를 삭제할까요?
            </div>
            <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
              {report.report_date} 리포트가 영구적으로 사라집니다.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-700 hover:bg-black/[0.04] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      <article className="max-w-6xl mx-auto px-4 md:px-8 py-10 section-stack">
        <div>
          <div className="eyebrow tabular-nums" style={{ color: ACCENT }}>
            주간 리포트 · {report.report_date}
          </div>
          <h1 className="display text-3xl md:text-4xl text-neutral-900 mt-3">
            주간 Product Hunt 리서치
          </h1>
          {data.collectionSummary && (
            <p className="text-base text-neutral-700 mt-5 leading-relaxed max-w-3xl">
              {data.collectionSummary}
            </p>
          )}
        </div>

        {fastest && data.fastestValidation && (
          <section
            className="hero relative overflow-hidden"
            style={{
              background:
                `linear-gradient(135deg, ${ACCENT_SOFT} 0%, #ffffff 60%, #ffffff 100%)`,
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-[0.06]"
              style={{
                background:
                  `radial-gradient(circle at 100% 0%, ${ACCENT} 0%, transparent 55%)`,
              }}
            />
            <div className="relative">
              <span
                className="inline-flex items-center gap-1.5 pill-accent"
                style={{ fontSize: "12px" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: ACCENT }}
                />
                가장 빠른 검증 경로
              </span>
              <h2 className="display text-2xl md:text-3xl text-neutral-900 mt-4">
                {fastest.rank}위 · {fastest.title}
              </h2>
              <p className="mt-4 text-base text-neutral-700 leading-relaxed max-w-3xl">
                {data.fastestValidation.rationale}
              </p>
              <div className="mt-6 flex items-center gap-5 md:gap-8 flex-wrap text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">난이도</span>
                  <span className="hidden md:inline-flex">
                    <ScoreDots value={fastest.difficultyStars} max={5} />
                  </span>
                  <span className="text-xs font-semibold text-neutral-800 tabular-nums">
                    {fastest.difficultyStars}/5
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">기회</span>
                  <span className="hidden md:inline-flex">
                    <ScoreDots
                      value={Math.round(fastest.opportunityScore / 2)}
                      max={5}
                      tone="accent"
                    />
                  </span>
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color: ACCENT }}
                  >
                    {fastest.opportunityScore}/10
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="표본 서비스" value={allServices.length} />
          <Kpi label="테마" value={data.themes.length} />
          <Kpi label="Top 아이디어" value={data.top5Opportunities.length} />
          <Kpi
            label="최대 시장 (2030)"
            value={biggestMarket?.value ?? "—"}
            hint={biggestMarket?.name}
            isText
          />
        </section>

        <Section number="01" title="테마 분포" caption="런칭이 어디에 몰렸는가">
          <div className="card">
            {themeDistribution.length === 0 ? (
              <Empty hint="테마 없음" />
            ) : (
              <ThemeDistributionChart data={themeDistribution} />
            )}
          </div>
        </Section>

        <Section
          number="02"
          title="서비스"
          caption={`${filteredServices.length} / ${allServices.length}개`}
        >
          <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex flex-wrap gap-1.5">
              {data.themes.map((t) => {
                const active = themeFilter === t.name;
                return (
                  <button
                    key={t.name}
                    onClick={() => setThemeFilter(t.name)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      active
                        ? "bg-neutral-900 text-white shadow-sm"
                        : "bg-white text-neutral-700 hover:text-neutral-900"
                    }`}
                    style={
                      active
                        ? undefined
                        : { boxShadow: "var(--shadow-1)" }
                    }
                  >
                    {t.name}
                    <span
                      className={`tabular-nums ${
                        active ? "text-white/60" : "text-neutral-400"
                      }`}
                      style={{ fontSize: "12px" }}
                    >
                      {t.services.length}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="ml-auto flex items-center gap-3 text-xs text-neutral-400 shrink-0">
              <span>정렬</span>
              {(
                [
                  { k: "upvotes", label: "Upvotes" },
                  { k: "name", label: "이름" },
                  { k: "theme", label: "테마" },
                ] as const
              ).map(({ k, label }) => {
                const active = sortBy === k;
                return (
                  <button
                    key={k}
                    onClick={() => cycleSort(k, sortBy, sortDir, setSortBy, setSortDir)}
                    className={`transition-colors ${
                      active
                        ? "text-neutral-900 font-medium"
                        : "text-neutral-400 hover:text-neutral-700"
                    }`}
                  >
                    {label}
                    {active && (
                      <span className="ml-0.5 text-neutral-400">
                        {sortDir === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredServices.length === 0 ? (
            <div className="card">
              <Empty hint="해당 테마에 서비스가 없어요." />
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredServices.map((s, i) => (
                <li key={`${s.name}-${i}`} className="card card-hover flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <ServiceIcon service={s} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3 flex-wrap">
                        <span className="text-base font-semibold text-neutral-900 headline-tight">
                          {s.name}
                        </span>
                        {s.upvotes != null && (
                          <span
                            className="text-xs font-semibold tabular-nums"
                            style={{ color: ACCENT }}
                          >
                            ▲ {s.upvotes.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">{s.themeName}</div>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-700 leading-relaxed flex-1">
                    {s.tag || "—"}
                  </p>
                  {(s.productHuntUrl || s.websiteUrl) && (
                    <div className="flex items-center gap-4 text-xs mt-1">
                      {s.productHuntUrl && (
                        <a
                          href={s.productHuntUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline"
                          style={{ color: ACCENT }}
                        >
                          Product Hunt ↗
                        </a>
                      )}
                      {s.websiteUrl && (
                        <a
                          href={s.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-neutral-500 hover:text-neutral-900 hover:underline"
                        >
                          Website ↗
                        </a>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section number="03" title="공통 문제" caption="문제들의 공통 패턴">
          {data.commonalities.length === 0 ? (
            <div className="card">
              <Empty hint="아직 없음" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.commonalities.map((c) => (
                <div key={c.order} className="card flex gap-5">
                  <div
                    className="shrink-0 w-9 h-9 grid place-items-center text-white text-sm font-bold rounded-full tabular-nums"
                    style={{ background: INK }}
                  >
                    {c.order}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-neutral-900 leading-snug headline-tight">
                      {c.headline}
                    </h3>
                    <p className="text-base text-neutral-700 mt-2 leading-relaxed">
                      {c.elaboration}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section
          number="04"
          title="시장 규모"
          caption="2024 → 2030 · 업계 리포트 방향성 참고"
        >
          {data.marketSize.koreaContext && (
            <div
              className="card mb-4"
              style={{ background: ACCENT_SOFT }}
            >
              <div className="text-xs font-semibold tracking-wide" style={{ color: ACCENT }}>
                한국 시장 맥락
              </div>
              <p className="text-base md:text-lg text-neutral-800 mt-3 leading-relaxed headline-tight">
                {data.marketSize.koreaContext}
              </p>
            </div>
          )}
          {marketChartData.length > 0 ? (
            <MarketSegmentsList data={marketChartData} />
          ) : (
            <div className="card">
              <Empty hint="시장 규모 데이터 없음" />
            </div>
          )}
        </Section>

        <Section
          number="05"
          title="Top 5 아이디어"
          caption="난이도 × 기회 매트릭스 · 좌상단이 스위트 스팟"
        >
          {data.top5Opportunities.length === 0 ? (
            <div className="card">
              <Empty hint="아직 없음" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-neutral-500">
                    좌상단이 <span style={{ color: ACCENT, fontWeight: 600 }}>스위트 스팟</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: ACCENT }}
                      />
                      1위
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: INK }}
                      />
                      2~5위
                    </span>
                  </div>
                </div>
                <div className="h-[300px] md:h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 24, left: 4, bottom: 48 }}>
                    <ReferenceArea
                      x1={0.5}
                      x2={3}
                      y1={5}
                      y2={10}
                      fill={ACCENT}
                      fillOpacity={0.1}
                    />
                    <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
                    <ReferenceLine x={3} stroke="#cbd5e1" strokeDasharray="4 4" />
                    <ReferenceLine y={5} stroke="#cbd5e1" strokeDasharray="4 4" />
                    <XAxis
                      type="number"
                      dataKey="difficulty"
                      name="난이도"
                      domain={[0.5, 5.5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tick={{ fontSize: 12, fill: INK }}
                      stroke={LINE}
                      height={30}
                      label={{
                        value: "난이도 →",
                        position: "insideBottom",
                        offset: -28,
                        fontSize: 12,
                        fill: MUTED,
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="opportunity"
                      name="기회"
                      domain={[0, 10]}
                      ticks={[0, 2, 4, 6, 8, 10]}
                      tick={{ fontSize: 12, fill: INK }}
                      stroke={LINE}
                      width={44}
                      label={{
                        value: "기회 ↑",
                        angle: -90,
                        position: "insideLeft",
                        offset: 16,
                        fontSize: 12,
                        fill: MUTED,
                      }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{
                        fontSize: 13,
                        borderRadius: 10,
                        border: "none",
                        boxShadow:
                          "0 10px 30px -8px rgba(15,23,42,0.16), 0 4px 12px -2px rgba(15,23,42,0.08)",
                      }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const p = payload[0].payload as {
                          rank: number;
                          title: string;
                          difficulty: number;
                          opportunity: number;
                        };
                        return (
                          <div
                            className="bg-white rounded-lg px-3 py-2"
                            style={{ boxShadow: "var(--shadow-pop)" }}
                          >
                            <div className="text-xs font-semibold text-neutral-900">
                              {p.rank}위 · {p.title}
                            </div>
                            <div className="text-xs text-neutral-500 mt-1 tabular-nums">
                              난이도 {p.difficulty}/5 · 기회 {p.opportunity}/10
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={scatterData} shape={<RankedDot />}>
                      {scatterData.map((d) => (
                        <Cell key={d.rank} fill={d.rank === 1 ? ACCENT : INK} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 mt-4 text-xs text-neutral-500">
                  <div>· 스위트 스팟 — 쉽고 기회 큼</div>
                  <div className="sm:text-right">· 도전 — 어렵고 기회 큼</div>
                  <div>· 안전 — 쉽고 기회 작음</div>
                  <div className="sm:text-right">· 피할 것 — 어렵고 기회 작음</div>
                </div>
              </div>

              <div className="space-y-3">
                {data.top5Opportunities
                  .slice()
                  .sort((a, b) => a.rank - b.rank)
                  .map((o) => {
                    const isTop = o.rank === 1;
                    return (
                      <div
                        key={o.rank}
                        className="card card-hover"
                        style={isTop ? { background: ACCENT_SOFT } : undefined}
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                          <div className="flex items-center gap-3">
                            <span
                              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-sm font-bold tabular-nums shrink-0"
                              style={{ background: isTop ? ACCENT : INK }}
                            >
                              {o.rank}
                            </span>
                            <span className="text-base md:text-lg font-bold text-neutral-900 headline-tight leading-snug">
                              {o.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 md:gap-5 text-xs shrink-0">
                            <div className="flex items-center gap-2">
                              <span className="text-neutral-500">난이도</span>
                              <span className="hidden md:inline-flex">
                                <ScoreDots
                                  value={o.difficultyStars}
                                  max={5}
                                  tone="ink"
                                />
                              </span>
                              <span className="font-semibold text-neutral-800 tabular-nums">
                                {o.difficultyStars}/5
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-neutral-500">기회</span>
                              <span className="hidden md:inline-flex">
                                <ScoreDots
                                  value={Math.round(o.opportunityScore / 2)}
                                  max={5}
                                  tone="accent"
                                />
                              </span>
                              <span
                                className="font-semibold tabular-nums"
                                style={{ color: ACCENT }}
                              >
                                {o.opportunityScore}/10
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
                          <div
                            className="rounded-lg p-4"
                            style={{ background: isTop ? "#ffffff" : "#f8fafc" }}
                          >
                            <div
                              className="text-xs font-semibold uppercase tracking-wide"
                              style={{ color: ACCENT }}
                            >
                              올라탄 트렌드
                            </div>
                            <p className="text-sm text-neutral-800 mt-2 leading-relaxed">
                              {o.ridingTrend || "—"}
                            </p>
                          </div>
                          <div
                            className="rounded-lg p-4"
                            style={{ background: isTop ? "#ffffff" : "#f8fafc" }}
                          >
                            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                              한국 시장 공백
                            </div>
                            <p className="text-sm text-neutral-800 mt-2 leading-relaxed">
                              {o.koreaGap || "—"}
                            </p>
                          </div>
                        </div>
                        {o.description && (
                          <div className="mt-5">
                            <div className="text-xs text-neutral-400 mb-1.5">설명</div>
                            <p className="text-sm text-neutral-700 leading-relaxed">
                              {o.description}
                            </p>
                          </div>
                        )}
                        {o.relatedServices && o.relatedServices.length > 0 && (
                          <div className="mt-5 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-neutral-400 mr-1">관련 서비스</span>
                            {o.relatedServices.map((s) => (
                              <span
                                key={s}
                                className="text-xs text-neutral-700 rounded-md px-2 py-0.5"
                                style={{ background: "var(--bg-alt)" }}
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
        </Section>

        {data.notes && (
          <section
            className="card-flat"
            style={{ background: "var(--muted)" }}
          >
            <div className="text-xs font-semibold text-neutral-600">에디터 메모</div>
            <p className="whitespace-pre-line text-sm text-neutral-700 mt-3 leading-relaxed">
              {data.notes}
            </p>
          </section>
        )}
      </article>
    </main>
  );
}

/* ---- subcomponents ---- */

function Kpi({
  label,
  value,
  hint,
  isText,
}: {
  label: string;
  value: number | string;
  hint?: string;
  isText?: boolean;
}) {
  return (
    <div className="card">
      <div className="text-xs text-neutral-500">{label}</div>
      <div
        className={`mt-3 font-bold text-neutral-900 headline-tight tabular-nums leading-none ${
          isText ? "text-xl" : "text-3xl"
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-neutral-500 mt-2 truncate">{hint}</div>}
    </div>
  );
}

function Section({
  number,
  title,
  caption,
  children,
}: {
  number: string;
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-5 flex-wrap">
        <span className="eyebrow tabular-nums">{number}</span>
        <h2 className="text-xl font-bold text-neutral-900 headline-tight">
          {title}
        </h2>
        {caption && <span className="text-xs text-neutral-500">{caption}</span>}
      </div>
      {children}
    </section>
  );
}

// Base Gallery palette (600 shades)
const THEME_PALETTE = [
  "#0E8345", // Green
  "#266EF1", // Blue
  "#944DE7", // Purple
  "#CA26A5", // Magenta
  "#C54600", // Orange
  "#007F8C", // Teal
  "#4F7F06", // Lime
  "#A95F03", // Amber
  "#B97502", // Yellow
  "#DE1135", // Red
];

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
        <span className="text-xs text-neutral-500">전체 {total}개 서비스</span>
        <span className="text-xs text-neutral-500 tabular-nums">
          {data.length}개 테마
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

type MarketRow = {
  name: string;
  "2024": number;
  "2030": number;
  cagr: string;
  raw2024: string;
  raw2030: string;
};

function MarketSegmentsList({ data }: { data: MarketRow[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d["2024"], d["2030"])), 1);
  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>세그먼트별 규모 · $B</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: "#0f0f0f", opacity: 0.28 }}
            />
            2024
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: "#0f0f0f" }}
            />
            2030
          </span>
        </div>
      </div>
      <ul className="space-y-5">
        {data.map((d, i) => {
          const color = THEME_PALETTE[i % THEME_PALETTE.length];
          const pct2024 = (d["2024"] / maxVal) * 100;
          const pct2030 = (d["2030"] / maxVal) * 100;
          const growthMultiple = d["2024"] > 0 ? d["2030"] / d["2024"] : null;
          return (
            <li key={d.name}>
              <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-sm font-semibold text-neutral-900 leading-snug">
                    {d.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-500 tabular-nums">
                  {d.cagr && <span>CAGR {d.cagr}</span>}
                  {growthMultiple && growthMultiple > 1 && (
                    <span style={{ color }}>×{growthMultiple.toFixed(1)}</span>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <BarRow
                  label="2024"
                  pct={pct2024}
                  value={d.raw2024}
                  color={color}
                  muted
                />
                <BarRow
                  label="2030"
                  pct={pct2030}
                  value={d.raw2030}
                  color={color}
                  emphasized
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BarRow({
  label,
  pct,
  value,
  color,
  emphasized,
  muted,
}: {
  label: string;
  pct: number;
  value: string;
  color: string;
  emphasized?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 text-xs text-neutral-500 tabular-nums shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-black/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.max(pct, 1)}%`,
            background: color,
            opacity: muted ? 0.32 : 1,
          }}
        />
      </div>
      <span
        className={`w-24 text-right text-xs tabular-nums shrink-0 ${
          emphasized ? "font-semibold" : "text-neutral-600"
        }`}
        style={emphasized ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function MonoBar({ data }: { data: Array<{ label: string; count: number }> }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <ul className="space-y-4">
      {data.map((d) => {
        const pct = (d.count / max) * 100;
        return (
          <li key={d.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-neutral-800 leading-snug">{d.label}</span>
              <span className="text-xs font-semibold text-neutral-900 tabular-nums shrink-0">
                {d.count}
              </span>
            </div>
            <div className="h-1.5 bg-black/[0.05] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: ACCENT }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function cycleSort(
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

function Empty({ hint }: { hint: string }) {
  return (
    <div className="h-[160px] grid place-items-center text-xs text-neutral-400">{hint}</div>
  );
}

function ReportDetailSkeleton() {
  return (
    <main className="min-h-[100dvh]">
      <header className="bg-[color:var(--bg)]/80 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="h-3 w-16 bg-black/[0.06] rounded animate-pulse" />
          <div className="h-3 w-24 bg-black/[0.06] rounded animate-pulse" />
          <div className="h-3 w-8 bg-black/[0.06] rounded animate-pulse" />
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 section-stack">
        <div>
          <div className="h-3 w-40 bg-black/[0.06] rounded animate-pulse" />
          <div className="h-8 w-96 max-w-full bg-black/[0.08] rounded animate-pulse mt-3" />
          <div className="h-3 w-full bg-black/[0.05] rounded animate-pulse mt-4" />
          <div className="h-3 w-3/4 bg-black/[0.05] rounded animate-pulse mt-2" />
        </div>
        <div className="card" style={{ padding: "32px" }}>
          <div className="h-3 w-32 bg-black/[0.08] rounded animate-pulse" />
          <div className="h-6 w-64 bg-black/[0.1] rounded animate-pulse mt-3" />
          <div className="h-3 w-full bg-black/[0.05] rounded animate-pulse mt-4" />
          <div className="h-3 w-4/5 bg-black/[0.05] rounded animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="h-3 w-20 bg-black/[0.06] rounded animate-pulse" />
              <div className="h-7 w-14 bg-black/[0.08] rounded animate-pulse mt-3" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
