import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  isReportSource,
  type MarketSize,
  type ReportSource,
  type ResearchData,
  type ResearchCommonality,
  type ResearchOpportunity,
  type ResearchTheme,
  type FastestValidation,
} from "@/lib/types";

type IngestBody = Partial<ResearchData> & {
  report_date?: string;
  source?: string;
};

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function todayYmd(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeMarket(v: unknown): MarketSize {
  const empty: MarketSize = { segments: [], koreaContext: "" };
  if (!v || typeof v !== "object") return empty;
  const m = v as Partial<MarketSize>;
  return {
    segments: Array.isArray(m.segments) ? m.segments : [],
    koreaContext: typeof m.koreaContext === "string" ? m.koreaContext : "",
  };
}

function normalizeThemes(v: unknown): ResearchTheme[] {
  if (!Array.isArray(v)) return [];
  return v.map((t) => {
    const th = t as Partial<ResearchTheme>;
    return {
      name: typeof th.name === "string" ? th.name : "",
      narrative: typeof th.narrative === "string" ? th.narrative : undefined,
      services: Array.isArray(th.services) ? th.services : [],
      problemStatement: typeof th.problemStatement === "string" ? th.problemStatement : "",
    };
  });
}

function normalizeCommonalities(v: unknown): ResearchCommonality[] {
  if (!Array.isArray(v)) return [];
  return v.map((c, i) => {
    const co = c as Partial<ResearchCommonality>;
    return {
      order: typeof co.order === "number" ? co.order : i + 1,
      headline: typeof co.headline === "string" ? co.headline : "",
      elaboration: typeof co.elaboration === "string" ? co.elaboration : "",
    };
  });
}

function normalizeOpportunities(v: unknown): ResearchOpportunity[] {
  if (!Array.isArray(v)) return [];
  return v.map((o) => {
    const op = o as Partial<ResearchOpportunity>;
    return {
      rank: typeof op.rank === "number" ? op.rank : 0,
      title: typeof op.title === "string" ? op.title : "",
      difficultyStars:
        typeof op.difficultyStars === "number"
          ? Math.max(1, Math.min(5, Math.round(op.difficultyStars)))
          : 3,
      opportunityScore:
        typeof op.opportunityScore === "number"
          ? Math.max(1, Math.min(10, op.opportunityScore))
          : 5,
      ridingTrend: typeof op.ridingTrend === "string" ? op.ridingTrend : "",
      koreaGap: typeof op.koreaGap === "string" ? op.koreaGap : "",
      description: typeof op.description === "string" ? op.description : undefined,
      relatedServices: Array.isArray(op.relatedServices) ? op.relatedServices : [],
    };
  });
}

function normalizeValidation(v: unknown): FastestValidation | undefined {
  if (!v || typeof v !== "object") return undefined;
  const fv = v as Partial<FastestValidation>;
  if (typeof fv.targetRank !== "number" || typeof fv.rationale !== "string") return undefined;
  return { targetRank: fv.targetRank, rationale: fv.rationale };
}

function normalize(body: IngestBody): ResearchData {
  return {
    collectionSummary: typeof body.collectionSummary === "string" ? body.collectionSummary : "",
    themes: normalizeThemes(body.themes),
    commonalities: normalizeCommonalities(body.commonalities),
    marketSize: normalizeMarket(body.marketSize),
    top5Opportunities: normalizeOpportunities(body.top5Opportunities),
    fastestValidation: normalizeValidation(body.fastestValidation),
    notes: typeof body.notes === "string" ? body.notes : "",
  };
}

export async function POST(req: Request) {
  const expected = process.env.INGEST_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "ingest_disabled", message: "INGEST_API_KEY is not configured on the server." },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: IngestBody;
  try {
    body = (await req.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const source: ReportSource = isReportSource(body.source) ? body.source : "product_hunt";
  const reportDate = body.report_date && isValidDate(body.report_date) ? body.report_date : todayYmd();
  const data = normalize(body);
  const dataJson = JSON.stringify(data);

  const result = await db.execute({
    sql: `INSERT INTO weekly_reports (source, report_date, data)
          VALUES (?, ?, ?)
          RETURNING id, source, report_date, created_at, updated_at`,
    args: [source, reportDate, dataJson],
  });

  const row = result.rows[0];
  return NextResponse.json({
    id: Number(row.id),
    source: String(row.source),
    report_date: String(row.report_date),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  });
}
