import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ProductHuntResearchData, WeeklyReportSummary } from "@/lib/types";

export async function GET() {
  const { rows } = await db.execute({
    sql: `SELECT id, report_date, data, created_at
          FROM weekly_reports
          ORDER BY report_date DESC, created_at DESC
          LIMIT 200`,
    args: [],
  });

  const summaries: WeeklyReportSummary[] = rows.map((r) => {
    let data: ProductHuntResearchData;
    try {
      data = JSON.parse(String(r.data)) as ProductHuntResearchData;
    } catch {
      data = {
        collectionSummary: "",
        serviceList: [],
        commonalities: [],
        marketSize: "",
        top5Opportunities: [],
        notes: "",
      };
    }
    const top = data.top5Opportunities?.[0]?.title ?? null;
    return {
      id: Number(r.id),
      report_date: String(r.report_date),
      collectionSummary: data.collectionSummary ?? "",
      topThemes: (data.commonalities ?? []).slice(0, 3),
      allCommonalities: data.commonalities ?? [],
      topOpportunityTitle: top,
      serviceCount: data.serviceList?.length ?? 0,
      created_at: Number(r.created_at),
    };
  });

  return NextResponse.json(summaries);
}
