# 리팩터 요약 (2026-07-10)

한 세션에 걸친 대시보드/상세 페이지 정보 위계·시각화·톤 개편. 시니어 UX/UI 리뷰 기반으로 15개 이슈를 잡고, 이후 세부 튜닝 반영.

## 1. Dashboard 재구성

- **최신 리포트 hero 승격** — 기존 최하단 Reports(#05) → 최상단 큰 카드 hero. `Top Pick` 미리보기 + Fastest validation 문구 + `리포트 보기 →` CTA. 사용자가 대시보드에 오는 진짜 이유(이번 주 리포트)를 즉시 노출.
- **KPI 를 모멘텀 기반으로** — Total / Services / Last / Themes(단순 사서 통계) → 이번 주 서비스(+델타), 이번 주 테마(+델타), 새로 등장한 테마, 누적 요약. 지난 주 대비 델타로 "무엇이 바뀌었나" 를 드러냄.
- **02·03·04 시각적 차별화** — 같은 `MonoBar` 세 번 → 반복 테마 `ChipCloud`(빈도별 폰트 크기·톤), 반복 문제 정의 `RankedList`(넘버링 리스트), 시장 세그먼트 `ThemeDistributionChart`(스택 바 + 컬러 리스트).
- **Weekly Trend 이중 Y축** — 서비스(0~25)/테마(0~8) 이 같은 축에 있어서 테마 라인이 바닥에 붙어 무의미했음. 좌축=서비스(accent), 우축=테마(ink 점선) 로 분리.
- **아카이브** — 지난 리포트(최신 제외) 를 최하단 그리드로 이동.
- **skeleton 로더** — "불러오는 중..." 텍스트 → 실제 레이아웃 형태의 skeleton 카드.

## 2. Report Detail 재구성

- **Fastest validation hero 승격** — KPI 밑 콜아웃 → 제목 바로 밑 큰 accent 카드. 리포트의 헤드라인 인사이트가 가장 먼저 보이도록.
- **Section 01 파이 차트 제거 → `ThemeDistributionChart`** — 파이 + 바 중복 시각화 정리. 하나의 스택 바 + 컬러 리스트로 통합. 10색 팔레트로 각 테마 구분.
- **Section 02 Services** — HTML 테이블(설명 컬럼이 눌려서 텍스트 잘림) → **2열 카드 리스트**. 아이콘·이름·upvote 상단, 설명 본문(text-sm), PH/Website 링크 하단 메타.
- **Section 02 필터 UX** — `<select>` 드롭다운 → **테마 chip 그리드**, 첫 테마 자동 선택. "전체" 제거. 정렬 chip 은 눈에 덜 띄게 텍스트 링크 스타일.
- **Section 03 공통 문제** — 3열 → 2열 카드, 순번 배지 + 헤드라인 `text-lg` + 본문 `text-base` 승격.
- **Section 04 시장 규모** — recharts `BarChart` → 커스텀 `MarketSegmentsList`. 각 세그먼트에 팔레트 색 부여, 2024 는 세그먼트 색 32% opacity(muted 베이스라인), 2030 은 full color(강조), CAGR + 성장 배수 표시. 한국 시장 맥락은 차트 위로 승격.
- **Section 05 Top 5 산점도 개선** — 사분면 shading(좌상단=스위트스팟 accent tint), 축 라벨 "쉬움 ← 난이도 → 어려움" / "낮음 ← 기회 → 높음", 커스텀 툴팁, 사분면 범례.
- **삭제 버튼 안전 배치** — 우상단 노출 → ⋯ 메뉴 뒤로 숨김, 모달 이중 확인.
- **skeleton 로더** — 상세 페이지 전용 스켈레톤 카드.

## 3. Service icon 자동 리졸빙 (신규)

리모트 에이전트가 리포트에 URL을 안 담는 문제. 이름만 있는 서비스에도 실제 PH 로고를 표시하도록 3-tier 리졸버 도입.

- **`/api/service-icon` API 라우트 신설** — 메모리 LRU 캐시(성공 24h · 실패 30m), 302 redirect 방식.
- **리졸빙 우선순위:**
  1. `iconUrl` 필드 (에이전트가 채워주면 우선)
  2. **PH GraphQL API** (`PH_TOKEN` env 있으면) — 이름 → slug 후보 → `post(slug:...)` 로 thumbnail 조회
  3. **Wayback Machine** (`web.archive.org/web/2/producthunt.com/products/{slug}`) — Cloudflare 봇 감지 우회. JSON-LD `Product.image` 파싱 후 Wayback wrapper 벗겨서 imgix 직접 URL 로 302
  4. Google favicon (도메인 있을 때)
  5. 이니셜 배지 (기존 로직)
- **Node fetch 가 Cloudflare TLS fingerprint 로 PH 페이지 직접 fetch 시 403 을 받아서 Wayback 프록시 방식을 채택함.** UA 헤더로는 우회 불가.

## 4. 시스템 전반 정리

- **한국어 primary 언어** — 섹션 타이틀·라벨·문구를 한국어로 통일. 영어는 eyebrow 보조 라벨에만.
- **이모지 완전 제거** — 🚀🇰🇷📈🥇🥈🥉🎯 등 감정형 이모지를 걷어내고 텍스트 라벨/monochrome UI 요소로 교체. 방향성 글리프(▲ upvote, → CTA) 만 유지.
- **별점·점수 스케일 통일** — 난이도 `x/5` + 기회 `x/10` 이중 스케일 → `ScoreDots` (5-dot 시각화) + 숫자 표기로 통일. 기회는 5로 정규화해 시각적으로 동일 스케일.
- **`eyebrow` 남발 정리** — 카드 안·리스트 아이템에 남발된 uppercase 라벨을 정리하고 hero/섹션 넘버 등 강조가 필요한 곳에만 유지.

## 5. Mobbin 톤 반영 (톤 개편)

- **배경 톤 조정** — `#fbfbfa` → **`#faf9f6`** (더 따뜻한 페이퍼 톤). 잉크 `#111` → **`#0a0a0a`**.
- **편집형 레이아웃** — 섹션 간격 `40px → 56px`. 섹션 헤더 밑에 얇은 divider (`.section-rule`). 카드 radius `12 → 10px`, padding `24 → 28px`.
- **타이포 위계 강화**
  - `.display` 유틸: `letter-spacing -0.032em`, `line-height 1.1`, bold — 큰 헤드라인 전용
  - `.headline-tight`: `-0.028em` (기존 `-0.025em` 보다 살짝 타이트)
  - `.eyebrow`: `11px / 700 / letter-spacing 0.12em` (조판형 마이크로 라벨)
  - hero h1/h2: `display text-3xl md:text-4xl` (톤 폴리싱 후 한 단계 낮춤)
  - Section h2: `text-lg → text-xl`
- **필터 chip** — 활성 상태에 subtle shadow, 비활성 hover 시 border 완전 검정 (Mobbin 특유의 outlined interaction).
- **폰트 최소 크기 상향** — body 14 → 15px, `text-xs` 12 → 13px, line-height 1.55 → 1.6, 인라인 fontSize 11/12 → 12/13 로 상향.
- **Sticky header 배경** — `bg-white/70` → `bg-[color:var(--bg)]/80` (본문 페이퍼 톤과 통일).
- **컬러 팔레트 확장** — 테마/세그먼트 시각화용 10색 팔레트(`emerald / cyan / violet / pink / orange / sky / lime / amber / indigo / rose`).

## 6. 그 외

- `next/react` unused import, 죽은 컴포넌트(`Th`, `MonoBar` 등) 정리.
- 스크래핑 관련 3개 route helper (JSON-LD 파서, Wayback unwrapper, slug candidate 생성기) 신설.
- 정렬 chip 시각적 비중 낮춤 — 배지형 채움 → 텍스트 링크 스타일.

## 파일 변경

- 신규: `src/app/api/service-icon/route.ts`, `CHANGES.md`
- 수정: `src/app/globals.css`, `src/components/Dashboard.tsx`, `src/components/ReportDetail.tsx`, `src/components/ServiceIcon.tsx`
