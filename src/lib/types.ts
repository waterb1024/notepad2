export type Notebook = {
  id: number;
  name: string;
  created_at: number;
  updated_at: number;
  note_count?: number;
};

export type Note = {
  id: number;
  notebook_id: number | null;
  title: string;
  content: string;
  plain_text: string;
  pinned: 0 | 1;
  archived: 0 | 1;
  created_at: number;
  updated_at: number;
};

export type NoteSummary = Pick<
  Note,
  "id" | "notebook_id" | "title" | "plain_text" | "pinned" | "updated_at" | "created_at"
>;

export type ResearchService = {
  name: string;
  tagline: string;
  problem: string;
  category?: string;
};

export type ResearchOpportunity = {
  rank: number;
  title: string;
  rationale: string;
  difficultyNotes: string;
  estimatedWeeks?: number;
};

export type ProductHuntResearchData = {
  collectionSummary: string;
  serviceList: ResearchService[];
  commonalities: string[];
  marketSize: string;
  top5Opportunities: ResearchOpportunity[];
  notes: string;
};

export type WeeklyReport = {
  id: number;
  report_date: string;
  data: ProductHuntResearchData;
  created_at: number;
  updated_at: number;
};

export type WeeklyReportSummary = {
  id: number;
  report_date: string;
  collectionSummary: string;
  topThemes: string[];
  allCommonalities: string[];
  topOpportunityTitle: string | null;
  serviceCount: number;
  created_at: number;
};
