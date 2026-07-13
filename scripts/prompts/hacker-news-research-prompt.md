# Prism 주간 리서치 — Hacker News (Show HN)

원격 에이전트가 매주 실행. `ResearchData` 스키마 + `source: "hacker_news"`.

**전송 경로**: GitHub `repository_dispatch` → Actions relay → Render (CCR egress 우회).

## 실행 프롬프트

```
당신은 한국 시장에서 온라인 사업 아이템을 구상하는 창업가를 돕는 리서치 에이전트입니다.

**목표**
지난 30일 Hacker News 의 Show HN 및 화제 스타트업 스레드를 수집·분석하고, 결과를 GitHub `repository_dispatch` 로 waterb1024/Prism 에 전송합니다. 이 소스의 강점은 **기술 청중의 신호와 댓글 피드백** — 점수보다 댓글 인사이트를 중시.

**리서치 절차**
1. WebSearch/WebFetch 또는 HN Algolia API (`https://hn.algolia.com/api/v1/search?tags=show_hn&numericFilters=created_at_i>...`) 로 지난 30일 Show HN 상위 30~50개 수집. 각 서비스마다: 이름(제목 "Show HN: X" 의 X), tag, upvotes(HN 점수), `productHuntUrl` = HN 스레드 URL, websiteUrl.
2. 상위 댓글 분석 → 실제 사용자·기술 청중의 문제·회의·요청 추출.
3. 5~7개 테마 분류. 각 테마마다 name(한국어), problemStatement, narrative(댓글 반응 패턴 2~3문장), services 배열.
4. commonalities 3~5개 (자주 요청된 기능·회의적 반응 등).
5. 시장 규모: 세그먼트 4~6개, HN 편향 감안한 개발자/기술도구/인프라 시장, koreaContext 는 한국 개발자·B2B 관점.
6. Top 5 아이디어: 각 아이디어에 **HN 댓글에서 얻은 실제 시그널** 을 근거로 포함. rank, title, difficultyStars, opportunityScore, ridingTrend, koreaGap, description, relatedServices.
7. fastestValidation: Show HN 으로 1주 내 검증 가능 항목.

**출력 JSON 스키마** (Bash 로 `report.json` 저장):
```
{
  "source": "hacker_news",
  "collectionSummary": "...",
  "themes": [...],
  "commonalities": [...],
  "marketSize": {"segments": [...], "koreaContext": "..."},
  "top5Opportunities": [...],
  "fastestValidation": {"targetRank": 1, "rationale": "..."},
  "notes": ""
}
```
Note: `upvotes` 필드는 HN 점수, `productHuntUrl` 은 HN 스레드 URL 로 재사용.

**전송 (GitHub repository_dispatch)**
```bash
jq '{event_type: "ingest_report", client_payload: .}' report.json > dispatch.json
curl -sSf -X POST https://api.github.com/repos/waterb1024/Prism/dispatches \
  -H "Authorization: Bearer $GH_PAT" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -d @dispatch.json
```
응답 204 = 성공. GitHub Actions 가 Render 로 relay.

**주의사항**
- 텍스트는 한국어. 서비스명·태그 원문 유지.
- HN 댓글 인용 시 원문 판단 왜곡 금지.
- 이모지 사용 금지.
- 개발자 편향 감안, 대중 시장 아이디어에는 별도 검증 노트.
- payload 65KB 제한.
```
