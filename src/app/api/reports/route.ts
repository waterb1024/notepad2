import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  isReportSource,
  type ReportSource,
  type ResearchData,
  type WeeklyReportSummary,
} from "@/lib/types";

function emptyData(): ResearchData {
  return {
    collectionSummary: "",
    themes: [],
    commonalities: [],
    marketSize: { segments: [], koreaContext: "" },
    top5Opportunities: [],
    notes: "",
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sourceParam = searchParams.get("source");
  const filterSource: ReportSource | null = isReportSource(sourceParam) ? sourceParam : null;

  const { rows } = filterSource
    ? await db.execute({
        sql: `SELECT id, source, report_date, data, created_at
              FROM weekly_reports
              WHERE source = ?
              ORDER BY report_date DESC, created_at DESC
              LIMIT 200`,
        args: [filterSource],
      })
    : await db.execute({
        sql: `SELECT id, source, report_date, data, created_at
              FROM weekly_reports
              ORDER BY report_date DESC, created_at DESC
              LIMIT 200`,
        args: [],
      });

  const summaries: WeeklyReportSummary[] = rows.map((r) => {
    let data: ResearchData;
    try {
      data = JSON.parse(String(r.data)) as ResearchData;
    } catch {
      data = emptyData();
    }
    const themes = data.themes ?? [];
    const serviceCount = themes.reduce((sum, t) => sum + (t.services?.length ?? 0), 0);
    const top = data.top5Opportunities?.[0] ?? null;
    const fastest = data.fastestValidation;
    const fastestTitle = fastest
      ? data.top5Opportunities.find((o) => o.rank === fastest.targetRank)?.title ?? null
      : null;
    const rawSource = String(r.source ?? "product_hunt");
    const source: ReportSource = isReportSource(rawSource) ? rawSource : "product_hunt";
    return {
      id: Number(r.id),
      source,
      report_date: String(r.report_date),
      collectionSummary: data.collectionSummary ?? "",
      themeCount: themes.length,
      serviceCount,
      themeNames: themes.map((t) => t.name).filter(Boolean),
      commonalityHeadlines: (data.commonalities ?? []).map((c) => c.headline).filter(Boolean),
      marketSegmentNames: (data.marketSize?.segments ?? []).map((s) => s.name).filter(Boolean),
      topOpportunityTitle: top?.title ?? null,
      topOpportunityStars: top?.difficultyStars ?? null,
      fastestValidationTitle: fastestTitle,
      created_at: Number(r.created_at),
    };
  });

  return NextResponse.json(summaries);
}
