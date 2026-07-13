import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  isReportSource,
  type ReportSource,
  type ResearchData,
  type WeeklyReport,
} from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const { rows } = await db.execute({
    sql: `SELECT id, source, report_date, data, created_at, updated_at
          FROM weekly_reports WHERE id = ?`,
    args: [id],
  });
  const r = rows[0];
  if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let data: ResearchData;
  try {
    data = JSON.parse(String(r.data)) as ResearchData;
  } catch {
    return NextResponse.json({ error: "corrupt_data" }, { status: 500 });
  }

  const rawSource = String(r.source ?? "product_hunt");
  const source: ReportSource = isReportSource(rawSource) ? rawSource : "product_hunt";

  const report: WeeklyReport = {
    id: Number(r.id),
    source,
    report_date: String(r.report_date),
    data,
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
  };
  return NextResponse.json(report);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  await db.execute({ sql: "DELETE FROM weekly_reports WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
