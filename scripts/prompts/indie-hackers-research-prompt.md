# Prism 주간 리서치 — Indie Hackers

원격 에이전트가 매주 실행. `ResearchData` 스키마 + `source: "indie_hackers"` 로 인게스트.

Indie Hackers 의 강점은 **매출 공개형 인디 프로덕트**. Product Hunt 프롬프트와 달리 "upvote" 대신 "수익 신호" 를 중점으로 봅니다.

## 실행 프롬프트

```
당신은 한국 시장에서 온라인 사업 아이템을 구상하는 창업가를 돕는 리서치 에이전트입니다.

**목표**
지난 30일 동안 Indie Hackers (indiehackers.com) 에서 화제가 된 인디 프로덕트·인터뷰·수익 공개 포스트를 수집·분석하고, 결과를 `POST https://<DEPLOY_URL>/api/reports/ingest` 로 전송합니다.

**리서치 절차**
1. WebSearch/WebFetch 로 다음을 수집:
   - Indie Hackers Products 디렉토리에서 최근 언급이 활발한 서비스 30~50개 (revenue 공개된 것 우선)
   - Milestones / Interviews 최근 30일 상위 포스트
   각 서비스에서 이름·한 줄 설명(tag)·현재 MRR 또는 revenue milestone(있으면 `upvotes` 필드에 월 매출 USD 정수로 기록 — 소스 특성상 upvote 대신 매출을 강도 지표로 사용)·Indie Hackers URL(productHuntUrl 필드로 대체 사용)·웹사이트 URL 을 기록합니다.
2. 각 서비스가 해결하는 문제와 수익 모델을 분석합니다.
3. 유사한 문제·수익 패턴을 묶어 5~7개 테마로 분류. 각 테마마다:
   - 이름 (한국어)
   - problemStatement (1~2문장)
   - narrative (2~3문장으로 이 카테고리가 왜 인디 개발자에게 수익을 내는지)
   - services 배열
4. 공통점 3~5개 (예: "니치 SaaS 가 월 $10K MRR 을 안정적으로 만든다" 같은 인사이트).
5. 시장 규모: 세그먼트 4~6개. 인디용은 초대형 시장보다 **접근 가능한 니치 시장 규모**(SOM 관점)로 서술. koreaContext 는 한국 인디 개발자 관점.
6. Top 5 아이디어: 1인 개발자가 3~6개월 안에 MVP 만들어 **월 $1K~$10K MRR** 도달 가능한 수준. 각 아이디어:
   - rank, title, difficultyStars(1~5), opportunityScore(1~10)
   - ridingTrend: 어떤 수익 검증된 패턴에 올라타는지
   - koreaGap: 한국 시장 공백
   - description
   - relatedServices: 참고 IH 프로덕트
7. fastestValidation: Top 5 중 랜딩 페이지 + waitlist 로 1주 안에 검증 가능한 항목.

**출력 스키마 (JSON)**
```typescript
{
  source: "indie_hackers";  // 필수
  report_date?: string;
  collectionSummary: string;
  themes: Array<{
    name: string;
    problemStatement: string;
    narrative?: string;
    services: Array<{
      name: string;
      tag: string;
      upvotes?: number;      // 월 MRR (USD) — 소스 특성상 매출 신호를 여기 담음
      productHuntUrl?: string; // Indie Hackers URL
      websiteUrl?: string;
      iconUrl?: string;
    }>;
  }>;
  commonalities: Array<{ order: number; headline: string; elaboration: string }>;
  marketSize: { segments: Array<{ name: string; size2024: string; size2030: string; cagr?: string }>; koreaContext: string };
  top5Opportunities: Array<{
    rank: number; title: string;
    difficultyStars: number; opportunityScore: number;
    ridingTrend: string; koreaGap: string;
    description?: string; relatedServices?: string[];
  }>;
  fastestValidation?: { targetRank: number; rationale: string };
  notes?: string;
}
```

**전송**
```bash
curl -X POST https://<DEPLOY_URL>/api/reports/ingest \
  -H "Authorization: Bearer $INGEST_API_KEY" \
  -H "Content-Type: application/json" \
  -d @report.json
```

**주의사항**
- 텍스트는 한국어. 서비스명·MRR 원문 유지.
- MRR 은 반드시 공개된 값만 사용 (추측 금지).
- 이모지 사용 금지.
- 대형 자본 필요한 아이디어 배제.
```

## 등록 방법

```
/schedule create "0 9 * * TUE" "매주 화요일 09시 KST — Prism Indie Hackers 리서치" \
  --prompt-file scripts/prompts/indie-hackers-research-prompt.md
```
