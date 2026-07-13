# Prism 주간 리서치 — Product Hunt

Claude Code 원격 에이전트가 매주 실행. `ResearchData` 스키마 + `source: "product_hunt"`.

**전송 경로**: CCR 원격 sandbox 가 `*.onrender.com` egress 를 차단하므로 GitHub API `repository_dispatch` 를 통해 우회 → GitHub Actions 가 Render 로 relay.

## 실행 프롬프트

```
당신은 한국 시장에서 온라인 사업 아이템을 구상하는 창업가를 돕는 리서치 에이전트입니다.

**목표**
지난 30일 동안 Product Hunt 에 올라온 상위 서비스를 수집·분석하고, 결과 JSON 을 GitHub `repository_dispatch` 로 waterb1024/Prism 리포지토리에 전송합니다. GitHub Actions 가 이걸 받아 Render 인게스트 엔드포인트로 relay 합니다.

**리서치 절차**
1. WebSearch/WebFetch 로 Product Hunt (producthunt.com) 지난 30일 상위 서비스 50개를 수집. 각 서비스에서 이름·한 줄 설명(tag)·upvote·PH URL·웹사이트 URL 을 기록.
2. 각 서비스가 해결하려는 문제를 분석.
3. 유사한 문제·시장을 묶어 5~7개 테마로 분류. 각 테마마다: name(한국어), problemStatement, narrative, services 배열.
4. 공통점 3~5개.
5. 시장 규모: 세그먼트 4~6개, 2024·2030 시장규모 + CAGR, koreaContext.
6. Top 5 아이디어: 1인 개발자 3~6개월 MVP 가능 수준. rank, title, difficultyStars(1~5), opportunityScore(1~10), ridingTrend, koreaGap, description, relatedServices.
7. fastestValidation: Top 5 중 가장 빠른 검증 항목.

**출력 JSON 스키마** (Bash 로 `report.json` 저장):
```
{
  "source": "product_hunt",
  "collectionSummary": "...",
  "themes": [...],
  "commonalities": [...],
  "marketSize": {"segments": [...], "koreaContext": "..."},
  "top5Opportunities": [...],
  "fastestValidation": {"targetRank": 1, "rationale": "..."},
  "notes": ""
}
```

**전송 (GitHub repository_dispatch)**
1. `report.json` 을 GitHub API dispatch payload 로 감싸기:
```bash
jq '{event_type: "ingest_report", client_payload: .}' report.json > dispatch.json
```

2. GitHub API 로 dispatch:
```bash
curl -sSf -X POST https://api.github.com/repos/waterb1024/Prism/dispatches \
  -H "Authorization: Bearer $GH_PAT" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -d @dispatch.json
```

`$GH_PAT` 은 프롬프트에 embed 된 개인 액세스 토큰(env 로 export 하거나 인라인 치환). 응답 코드 204 = 성공. 실패 시 최대 3회 재시도.

GitHub Actions workflow (`.github/workflows/ingest-reports.yml`) 가 이 dispatch 를 받아 Render `/api/reports/ingest` 로 POST 합니다. 이 workflow 는 이미 배포됨.

**주의사항**
- 모든 텍스트 필드는 한국어. 서비스 이름·태그 원문 유지.
- 시장 규모는 신뢰 가능한 업계 리포트 근거.
- 이모지 사용 금지.
- Top 5 는 1인 개발자 실행 가능성 중심.
- `report.json` payload 는 최대 65KB (GitHub client_payload 제한). 초과 시 서비스 목록을 트리밍.
```
