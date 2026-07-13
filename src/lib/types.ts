export type ReportSource = "product_hunt" | "indie_hackers" | "hacker_news";

export const REPORT_SOURCES: ReadonlyArray<ReportSource> = [
  "product_hunt",
  "indie_hackers",
  "hacker_news",
];

export function isReportSource(v: unknown): v is ReportSource {
  return typeof v === "string" && (REPORT_SOURCES as readonly string[]).includes(v);
}

export const SOURCE_LABEL: Record<ReportSource, string> = {
  product_hunt: "Product Hunt",
  indie_hackers: "Indie Hackers",
  hacker_news: "Hacker News",
};

export const SOURCE_SHORT: Record<ReportSource, string> = {
  product_hunt: "PH",
  indie_hackers: "IH",
  hacker_news: "HN",
};

export type ThemeService = {
  name: string;
  tag: string;
  upvotes?: number;
  websiteUrl?: string;
  iconUrl?: string;
  productHuntUrl?: string;
};

export type ResearchTheme = {
  name: string;
  narrative?: string;
  services: ThemeService[];
  problemStatement: string;
};

export type ResearchCommonality = {
  order: number;
  headline: string;
  elaboration: string;
};

export type MarketSegment = {
  name: string;
  size2024: string;
  size2030: string;
  cagr?: string;
};

export type MarketSize = {
  segments: MarketSegment[];
  koreaContext: string;
};

export type ResearchOpportunity = {
  rank: number;
  title: string;
  difficultyStars: number;
  opportunityScore: number;
  ridingTrend: string;
  koreaGap: string;
  description?: string;
  relatedServices?: string[];
};

export type FastestValidation = {
  targetRank: number;
  rationale: string;
};

export type ResearchData = {
  collectionSummary: string;
  themes: ResearchTheme[];
  commonalities: ResearchCommonality[];
  marketSize: MarketSize;
  top5Opportunities: ResearchOpportunity[];
  fastestValidation?: FastestValidation;
  notes: string;
};

export type WeeklyReport = {
  id: number;
  source: ReportSource;
  report_date: string;
  data: ResearchData;
  created_at: number;
  updated_at: number;
};

export type WeeklyReportSummary = {
  id: number;
  source: ReportSource;
  report_date: string;
  collectionSummary: string;
  themeCount: number;
  serviceCount: number;
  themeNames: string[];
  commonalityHeadlines: string[];
  marketSegmentNames: string[];
  topOpportunityTitle: string | null;
  topOpportunityStars: number | null;
  fastestValidationTitle: string | null;
  created_at: number;
};
