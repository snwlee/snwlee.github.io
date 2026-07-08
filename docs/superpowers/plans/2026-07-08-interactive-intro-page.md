# 인터랙티브 소개 페이지 (snwlee.github.io) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 다크 스크롤리텔링 개인 소개 페이지를 바닐라 HTML/CSS/JS 단일 페이지로 만들어 GitHub Pages 루트(snwlee.github.io)에 배포한다.

**Architecture:** 정적 단일 페이지. IntersectionObserver 기반 reveal/카운트업, 외부 데이터(GitHub 잔디·WakaTime)는 클라이언트 fetch + `data/stats.json` 폴백. 빌드체인 없음 — 파일 그대로 서빙.

**Tech Stack:** HTML5, CSS(커스텀 프로퍼티·scroll-driven 애니메이션+IO 폴백), Vanilla JS(ES modules 아님, 단일 IIFE), GitHub Pages.

## Global Constraints

- 프레임워크·번들러·외부 JS 라이브러리 금지 (바닐라만)
- JS 총량 < 80KB (목표: < 10KB)
- 폰트 최대 2 패밀리: Pretendard(본문) + Space Grotesk(디스플레이 숫자/영문) — 이력서와 동일 CDN
- 다크 고정 (라이트 테마 없음), 한국어만
- `prefers-reduced-motion: reduce` 시 모든 모션 제거, 콘텐츠는 전부 노출
- 외부 fetch는 반드시 타임아웃+폴백 — JS 실패/오프라인에서도 전체 콘텐츠 렌더
- 콘텐츠 정직성: 고객사 실명 금지, 검증 수치만(215/600/117/85/24/30/3,000), K8s "참여"·PoC "진행 중"·CKA "준비 중" 표기 유지
- 커밋 메시지: conventional commits (`feat:`, `content:`, `fix:`)
- 로컬 프리뷰: `python -m http.server 8777` (repo 루트에서)

## File Structure

```
index.html    # 전체 마크업 (섹션 10개, 정적 콘텐츠 전부 포함)
main.css      # 토큰 → 베이스 → 섹션별 스타일 → 모션 → 반응형
main.js       # reveal 엔진, 카운트업, Live Board fetch/렌더 (IIFE 1개)
data/stats.json  # 수동 지표 + fetch 폴백
```

---

### Task 1: 스캐폴드 + 디자인 토큰 + Hero

**Files:**
- Create: `index.html`, `main.css`, `.gitignore`
- Test: 브라우저 프리뷰 (스크린샷)

**Interfaces:**
- Produces: `main.css`의 디자인 토큰(아래 값 그대로) — 이후 모든 태스크가 사용. 섹션 공통 클래스 `.section`, reveal 대상 `.reveal`.

- [ ] **Step 1: index.html 뼈대 작성** — `<html lang="ko">`, 메타(제목 "이선우 — AI · Cloud · Quantum Native", description, og 태그), 폰트 2종 링크(이력서와 동일 CDN), `main.css`/`main.js` 링크(defer). `<main>` 안에 섹션 10개의 빈 `<section id>` 배치: `hero, quote-resilience, timeline, numbers, quote-environment, interests, liveboard, now, projects, contact`.
- [ ] **Step 2: main.css 토큰+베이스 작성**

```css
:root {
  --bg: #07090c;            /* 거의 검정, 파랑기 */
  --bg-raise: #0d1117;
  --text: #e6e8eb;
  --text-dim: #8b949e;
  --accent: #4ade80;        /* LED 그린 — 잔디·포인트 */
  --accent-ai: #a78bfa;     /* AI 보라 */
  --accent-cloud: #38bdf8;  /* Cloud 하늘 */
  --accent-quantum: #f472b6;/* Quantum 핑크 */
  --font-body: "Pretendard", sans-serif;
  --font-display: "Space Grotesk", "Pretendard", sans-serif;
  --text-hero: clamp(2.5rem, 1rem + 6vw, 6rem);
  --text-quote: clamp(1.6rem, 1rem + 3.5vw, 3.5rem);
  --space-section: clamp(5rem, 4rem + 8vw, 12rem);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

배이스: `body{background:var(--bg);color:var(--text);font-family:var(--font-body)}`, `.section{min-height:60vh;padding:var(--space-section) clamp(1.25rem,4vw,4rem);max-width:1100px;margin-inline:auto}`.
- [ ] **Step 3: Hero 마크업+스타일** — 화면 100vh. 내용: 상단 작은 kicker `SUNWOO LEE`, 중앙 `<h1>`(두 줄) `연결하는 사람,` / `이선우입니다.`, 아래 서브텍스트 `엔터프라이즈 연동 백엔드 · 215개 고객사의 서로 다른 시스템을 하나로`, 그 아래 3개 칩 `AI Native`(보라) `Cloud Native`(하늘) `Quantum Native`(핑크), 하단 중앙 `↓ scroll` 인디케이터(2s 무한 bounce, reduced-motion 시 정지). 배경: `radial-gradient(1200px 600px at 70% -10%, #10321f66, transparent)` 은은한 글로우 1개.
- [ ] **Step 4: 프리뷰 확인** — Run: `python -m http.server 8777` → 브라우저 스크린샷으로 Hero 확인. Expected: 다크 배경 + 타이포 정상.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: scaffold + design tokens + hero"`

---

### Task 2: reveal 엔진 + 좌우명 인터루드 2개

**Files:**
- Create: `main.js`
- Modify: `index.html`(quote 섹션 2개), `main.css`

**Interfaces:**
- Produces: `main.js`에 IIFE — 내부 함수 `initReveal()`(`.reveal` 요소가 뷰포트 25% 진입 시 `.is-visible` 부여, 1회성), `initCounters()`·`initLiveBoard()`는 이후 태스크가 같은 IIFE에 추가. CSS: `.reveal{opacity:0;transform:translateY(24px);transition:opacity .8s var(--ease-out),transform .8s var(--ease-out)}`, `.reveal.is-visible{opacity:1;transform:none}`, `@media (prefers-reduced-motion: reduce){.reveal{opacity:1;transform:none;transition:none}}`.

- [ ] **Step 1: main.js reveal 엔진**

```js
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (reduced || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.25 });
    els.forEach(function (el) { io.observe(el); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initReveal();
  });
})();
```

- [ ] **Step 2: 좌우명 섹션 2개 마크업** — 각각 100vh 중앙 정렬, `--text-quote` 크기.
  - `#quote-resilience`: 영문 원문 `"Resilience matters in success."` 큰 디스플레이 폰트 + 아래 번역 `성공을 결정짓는 핵심은 결국 회복탄력성이다.` + 출처 `— Jensen Huang, NVIDIA` (dim).
  - `#quote-environment`: `"의지를 믿지 말고, 환경을 만드세요."` + 부연 `노력보다는 환경을` + 출처 `— 이동욱, 인프런 CTO` (dim).
  - 두 인용 모두 단어 단위 `<span class="reveal">` 분해 + `transition-delay` 계단식(단어당 60ms, CSS `--i` 변수)으로 한 단어씩 점등.
- [ ] **Step 3: 프리뷰** — 스크롤 시 인용문이 단어별로 떠오르는지, reduced-motion 에뮬레이션 시 즉시 표시되는지 확인.
- [ ] **Step 4: Commit** — `git commit -am "feat: reveal engine + quote interludes"`

---

### Task 3: 연혁 타임라인

**Files:**
- Modify: `index.html`(#timeline), `main.css`

**Interfaces:**
- Consumes: `.reveal` 엔진 (노드 점등에 그대로 사용)

- [ ] **Step 1: 타임라인 마크업** — 세로 라인(왼쪽 2px, `--bg-raise`→`--accent` 그라디언트) + 노드 `<li class="reveal">`. 항목(연도·제목·1줄 설명, 아래 그대로):
  - 2016 — `에너지자원공학과 입학` · 강원대. 코드와 무관한 출발점.
  - 2021 — `졸업, 그리고 방향 전환 결심` · 전공이 아닌 소프트웨어에서 답을 찾기로.
  - 2022.02–07 — `Java 백엔드 교육과정` · 비전공에서 개발자로, 6개월의 몰입.
  - 2022.08–09 — `DevCamp 1기 최우수상 (1위)` · Java의 정석 남궁성 DevCamp — 팀 프로젝트 1위, 상금 300만원.
  - 2023.06 — `넷앤드 입사 — 엔터프라이즈 연동의 세계` · 접근통제 솔루션 HIWARE, 고객사마다 다른 시스템을 잇는 일.
  - 2024 — `연동의 폭이 커지다` · 인사·알림·SSO — 금융·대기업 고객사 확장.
  - 2025 — `AI를 업무에 심다` · 사내 AI TF — 이슈 분류·영향도 분석 자동화 파이프라인 주도.
  - 2026 — `Cloud · 오픈소스 · 그리고 다음` · AWS SAA 취득, K8s 접근통제 참여, 오픈소스 2종 공개, CKA 준비.
- [ ] **Step 2: 스타일** — 노드 도트는 `.is-visible` 시 `--accent` 글로우(`box-shadow: 0 0 12px`). 연도는 디스플레이 폰트.
- [ ] **Step 3: 프리뷰 + Commit** — `git commit -am "feat: career timeline section"`

---

### Task 4: 숫자 카운트업

**Files:**
- Modify: `index.html`(#numbers), `main.css`, `main.js`

**Interfaces:**
- Produces: `initCounters()` — `[data-count]` 요소를 IO 진입 시 0→목표값 애니메이션(1.2s, easeOut). reduced-motion 시 즉시 최종값.

- [ ] **Step 1: 마크업** — 2×2 그리드(모바일 1열), 각 스탯: 큰 숫자(`<span data-count="215">0</span>`+단위) + 라벨.
  - `215` 곳 — 연동 고객사
  - `600` 건+ — 담당 연동 작업
  - `30` 개 — 운영 중인 앱
  - `3,000` — 최대 DAU
- [ ] **Step 2: initCounters 구현**

```js
function initCounters() {
  var els = document.querySelectorAll("[data-count]");
  function animate(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (reduced) { el.textContent = target.toLocaleString(); return; }
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / 1200, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (!("IntersectionObserver" in window)) { els.forEach(animate); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  els.forEach(function (el) { io.observe(el); });
}
```

`DOMContentLoaded` 핸들러에 `initCounters();` 추가.
- [ ] **Step 3: 프리뷰(카운트업 동작) + Commit** — `git commit -am "feat: count-up numbers section"`

---

### Task 5: 관심사 3갈래 (콘텐츠 수집 포함)

**Files:**
- Modify: `index.html`(#interests), `main.css`

- [ ] **Step 1: 사용자에게 콘텐츠 질문** — AskUserQuestion으로 수집: ① AI 도입 시점·계기(1~2문장) ② AWS 컨퍼런스 참여 이력(행사명·연도) ③ 양자 컨퍼런스 2회(행사명·시기). 답을 받은 뒤 Step 2의 본문에 반영. (답을 못 받으면 아래 기본 문안으로 먼저 출시하고 항목은 생략 — 빈 칸·placeholder 노출 금지)
- [ ] **Step 2: 3패널 마크업** — 세로 스택 3개(각 min-height 70vh), 좌측 얇은 색 보더(각 accent 색).
  - **AI Native** (보라): 기본 문안 — `2024년, 반복되는 이슈 분석에 지쳐 AI를 업무에 심기 시작했다.` / 현재: 이슈 자동 분류→영향도 분석→코드 수정안 생성 파이프라인 주도, RAG 사내 챗봇, 일상 도구로서의 Claude Code. 각주: `이 페이지도 Claude와 함께 만들었다.`
  - **Cloud Native** (하늘): AWS SAA(2026.04 취득) → CKA(2026.08 응시 준비) → 사내 EKS 접근통제 참여 → Keycloak OIDC PoC 진행. + AWS 컨퍼런스 이력(Step 1 답변).
  - **Quantum Native** (핑크): `아직은 관객이다. 하지만 가장 앞줄의 관객이고 싶다.` + 2026년 양자 컨퍼런스 2회 참여(Step 1 답변) + 다음 물결을 미리 보는 이유 1문장.
- [ ] **Step 3: 프리뷰 + Commit** — `git commit -am "content: three-way interests (AI/Cloud/Quantum)"`

---

### Task 6: Live Board (조명판)

**Files:**
- Create: `data/stats.json`
- Modify: `index.html`(#liveboard), `main.css`, `main.js`

**Interfaces:**
- Produces: `initLiveBoard()` — 잔디 fetch→LED 렌더, WakaTime fetch, 토큰 수동값 렌더. 모든 fetch 5s 타임아웃, 실패 시 `stats.json` `fallback` 사용 + `.board-note`에 `오프라인 스냅샷` 라벨.

- [ ] **Step 1: stats.json 작성**

```json
{
  "asOf": "2026-07",
  "tokens": { "value": "—", "note": "Claude/Codex 데스크탑 기준, 수동 갱신" },
  "wakatimeShareUrl": "",
  "fallback": {
    "contributions": [],
    "codingHours": "측정 시작"
  }
}
```

(tokens.value·wakatimeShareUrl은 사용자 제공 시 갱신 — 값이 `—`/빈 문자열이면 해당 타일은 "수집 중" 상태로 렌더, placeholder 노출 금지)
- [ ] **Step 2: 마크업+LED 스타일** — 섹션 배경 `--bg-raise` 패널, 제목 `LIVE BOARD`(디스플레이 폰트, letter-spacing). 내부 3타일: ① 잔디 그리드(`.grass` = CSS grid 53×7, 셀 10px, 레벨별 `--accent` 알파 5단계, `box-shadow` 글로우) ② 코딩 시간(큰 숫자) ③ 누적 토큰(큰 숫자 + `기준: {asOf}` dim 라벨).
- [ ] **Step 3: initLiveBoard 구현**

```js
function fetchJSON(url, ms) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () { reject(new Error("timeout")); }, ms);
    fetch(url).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(resolve, reject);
  });
}

function renderGrass(weeks) { /* weeks: [{days:[0..4 level]}] → grid cell div 생성, level→CSS class */ }

function initLiveBoard() {
  fetchJSON("data/stats.json", 3000).then(function (stats) {
    document.querySelector("#stat-tokens .stat-value").textContent = stats.tokens.value;
    document.querySelector("#stat-tokens .stat-note").textContent = "기준: " + stats.asOf;
    // 잔디: 공개 컨트리뷰션 API
    fetchJSON("https://github-contributions-api.jogruber.de/v4/snwlee?y=last", 5000)
      .then(function (d) { renderGrass(d.contributions); })
      .catch(function () {
        if (stats.fallback.contributions.length) renderGrass(stats.fallback.contributions);
        document.querySelector("#stat-grass .stat-note").textContent = "오프라인 스냅샷";
      });
    // WakaTime (share URL 설정 시에만)
    if (stats.wakatimeShareUrl) {
      fetchJSON(stats.wakatimeShareUrl, 5000)
        .then(function (d) { /* d.data 합산 → #stat-coding .stat-value */ })
        .catch(function () { document.querySelector("#stat-coding .stat-value").textContent = stats.fallback.codingHours; });
    } else {
      document.querySelector("#stat-coding .stat-value").textContent = stats.fallback.codingHours;
    }
  }).catch(function () { /* stats.json조차 실패: 타일 3개 모두 정적 문구 "—" */ });
}
```

`renderGrass`는 실제 구현 시 API 응답 형식(`contributions: [{date, count, level}]`)에 맞춰 최근 371일→53주 그리드로 변환. `DOMContentLoaded`에 `initLiveBoard();` 추가.
- [ ] **Step 4: 검증** — 프리뷰에서 ① 정상 fetch 시 잔디 렌더 ② DevTools 오프라인 모드에서 폴백 문구 렌더·레이아웃 안 깨짐 확인.
- [ ] **Step 5: Commit** — `git commit -am "feat: live board (grass LED + wakatime + tokens)"`

---

### Task 7: Now + 프로젝트 쇼케이스 + 링크 허브

**Files:**
- Modify: `index.html`(#now, #projects, #contact), `main.css`

- [ ] **Step 1: Now 섹션** — `NOW — 2026.07` 헤딩 + 리스트 3개(각 상태 뱃지 pulse 도트, reduced-motion 시 정지): `CKA 준비 중 — 8월 응시` / `Keycloak OIDC → EKS 인증 PoC 진행 중` / `오픈소스 2종 운영 — AiIssueTriage · KubeAccessBroker`.
- [ ] **Step 2: 프로젝트 카드 4개** — 그리드(2열, 모바일 1열), 카드: 제목·1줄 설명·태그·링크.
  - AiIssueTriage — 이슈 자동 분류·RAG 영향도 분석 파이프라인 · Python/FastAPI/pgvector · github.com/snwlee/AiIssueTriage
  - KubeAccessBroker — K8s 접근권한 브로커(단기 토큰·RBAC·감사) · Java/Spring Boot/fabric8 · github.com/snwlee/KubeAccessBroker
  - 엔터프라이즈 AI 자동화 파이프라인 — 이슈→분석→코드 수정안→빌드 자동화 (사내) · 링크 없음
  - 배경화면 앱 30개 — Flutter, 최대 DAU 3,000 · 링크 없음
  카드 hover: `translateY(-4px)` + 보더 accent.
- [ ] **Step 3: 링크 허브** — 마지막 100vh 중앙: `더 깊은 이야기는 여기에` + 링크 4개(큰 버튼): 이력서 `/resume` · GitHub `github.com/snwlee` · Velog `velog.io/@iseon_u` · 이메일 `pgrrr119@gmail.com`. 푸터 한 줄: `Built with Claude · 2026` (dim).
- [ ] **Step 4: 프리뷰 + Commit** — `git commit -am "feat: now + projects + contact hub"`

---

### Task 8: 품질 검증 (반응형·모션·오프라인·Lighthouse)

**Files:**
- Modify: 발견된 이슈에 따라 `main.css`/`index.html`

- [ ] **Step 1: 반응형** — 320/375/768/1024/1440/1920 스크린샷, 가로 오버플로 0 확인 (특히 잔디 그리드: 모바일에서 `overflow-x:auto` 컨테이너).
- [ ] **Step 2: reduced-motion** — DevTools 에뮬레이션: 모든 콘텐츠 즉시 표시, 애니메이션 없음.
- [ ] **Step 3: 오프라인** — Network offline: 폴백 렌더, 콘솔 에러 무해 확인.
- [ ] **Step 4: Lighthouse** — 성능·접근성·SEO 확인, 접근성 90+ 목표(헤딩 계층, 명도 대비 — dim 텍스트 4.5:1 이상).
- [ ] **Step 5: 수정사항 Commit** — `git commit -am "fix: responsive/a11y polish"`

---

### Task 9: GitHub repo 생성·푸시·Pages 배포

**Files:** 없음 (인프라)

- [ ] **Step 1: repo 생성+푸시** — Run: `gh repo create snwlee/snwlee.github.io --public --source . --push` (기존 gh 인증 사용). Expected: `https://github.com/snwlee/snwlee.github.io` 생성.
- [ ] **Step 2: Pages 확인** — `<user>.github.io` repo는 main 브랜치 루트가 자동 배포됨. `gh api repos/snwlee/snwlee.github.io/pages`로 상태 확인, 수 분 후 `https://snwlee.github.io` 접속 확인.
- [ ] **Step 3: 기존 이력서 링크 무결성** — `https://snwlee.github.io/resume/` 여전히 동작하는지 확인 (프로젝트 페이지는 루트 페이지와 공존).
- [ ] **Step 4: 실배포 스크린샷 확인 + 최종 Commit**

---

## Self-Review 결과

- 스펙 커버리지: 10개 섹션 전부 태스크에 매핑(1:Hero, 2:좌우명×2, 3:타임라인, 4:카운트업, 5:관심사, 6:LiveBoard, 7:Now/프로젝트/허브, 8:검증, 9:배포). 사용자 준비물은 Task 5 Step 1(질문)과 Task 6 stats.json 갱신 경로로 처리.
- 플레이스홀더: 사용자 미제공 콘텐츠는 "질문→반영, 미응답 시 해당 항목 생략" 규칙으로 처리 — 화면에 TBD 노출 없음.
- 타입 일관성: `initReveal/initCounters/initLiveBoard` 명칭, `.reveal/.is-visible/[data-count]` 셀렉터 태스크 간 일치 확인.
