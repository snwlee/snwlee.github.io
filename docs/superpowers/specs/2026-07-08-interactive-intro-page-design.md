# 설계: snwlee.github.io — 인터랙티브 개인 소개 페이지

- 날짜: 2026-07-08
- 상태: 사용자 승인됨 (브레인스토밍 완료)
- 배포: GitHub Pages, 새 repo `snwlee/snwlee.github.io` (루트 도메인)
- 기존 이력서(`snwlee.github.io/resume`)와 **별개** — 이력서는 그대로 유지

## 목적

"Claude로 여기까지 만들었다" 류 쇼케이스처럼 인상적인 **다크 스크롤리텔링** 소개 페이지.
내용은 이선우의 서사: 전환 스토리 → 성장 → 현재 관심사(AI·Cloud·Quantum) → 살아있는 지표.

## 확정된 요구사항

| 항목 | 결정 |
|---|---|
| 배포 위치 | `snwlee.github.io` 루트 (새 repo) |
| 디자인 무드 | 다크 스크롤리텔링 (몰입형, 큰 타이포) |
| 연혁 시작점 | 전환 스토리부터 (에너지자원공학 → 개발자) |
| 언어 | 한국어만 (영문은 추후 필요시) |
| 추가 요소 | 숫자 카운트업 · Now 섹션 · AI 워크플로우 공개 · 링크 허브 CTA · **Live Board(조명판)** |
| 조명판 데이터 | 커밋 잔디(자동) · WakaTime 코딩시간(자동) · 토큰 사용량(수동 JSON + 기준일 라벨) |
| 기술 | **바닐라** (접근법 A) — 프레임워크·빌드체인 없음 |

## 기술 구조

```
snwlee.github.io/
├── index.html          # 단일 페이지
├── main.css            # 디자인 토큰 + 섹션 스타일
├── main.js             # IntersectionObserver reveal, 카운트업, fetch
├── data/
│   └── stats.json      # 수동 지표 + fetch 폴백 캐시
└── docs/superpowers/specs/  # 이 문서
```

- CSS scroll-driven animations(지원 브라우저) + IntersectionObserver 폴백
- `prefers-reduced-motion` 대응 (모션 없이도 전체 콘텐츠 접근 가능)
- 폰트: Pretendard(본문) + 디스플레이 1종(큰 타이포). 최대 2 패밀리
- 성능 예산: 마이크로사이트 기준 (JS < 80KB — 실제 몇 KB 수준 목표)

### data/stats.json 스키마 (합성 예시)

```json
{
  "asOf": "2026-07",
  "tokens": { "label": "누적 토큰", "value": "1.2B+", "source": "Claude/Codex 데스크탑, 수동 갱신" },
  "fallback": {
    "contributions": [[0,1,3,0,2], "..."],
    "codingHours": "—"
  }
}
```

## 섹션 흐름 (스크롤 순서 = 서사 순서)

1. **Hero** — 이름 + 한 줄 정체성, "AI · Cloud · Quantum Native" 티저, 스크롤 유도
2. **좌우명 #1 (인터루드)** — 젠슨 황 *"Resilience matters in success."* 큰 타이포 → 직후 전환 스토리의 예고편 역할
3. **연혁 타임라인** — 세로 타임라인, 스크롤 시 노드 점등: 에너지자원공학 → 전환(2022 교육과정·DevCamp 최우수상 1위) → 넷앤드 입사(2023.06) → 연동/SSO → K8s·AI TF → 현재
4. **숫자 카운트업** — 고객사 215 · 연동 600건 · 앱 30개 · 최대 DAU 3,000 (업무 DB 검증 수치만, 추정 금지)
5. **좌우명 #2 (인터루드)** — 이동욱 *"의지를 믿지 말고 환경을 만드세요"* → 직후 "내가 만든 환경"(AI 워크플로우)으로 연결
6. **관심사 3갈래 (3패널)**
   - **AI Native**: 도입 시점→현재 활용, AI 워크플로우 공개(Claude Code·RAG 파이프라인), "이 페이지도 Claude로 제작" 각주
   - **Cloud Native**: AWS SAA(2026.04) · CKA 준비(2026.08 응시) · AWS 컨퍼런스 참여 이력
   - **Quantum Native**: 2026년 양자 컨퍼런스 2회 참여
7. **Live Board (조명판)** — LED 도트 미학:
   - 커밋 잔디: GitHub 기여 데이터 클라이언트 fetch(공개 API), 로드 시점 실시간
   - 코딩 시간: WakaTime 공개 JSON
   - 토큰 사용량: `stats.json` 수동 값 + "기준: YYYY-MM" 라벨
   - **모든 fetch는 타임아웃 + stats.json 폴백** → 절대 깨지지 않음
8. **Now** — CKA 준비 · Keycloak→EKS PoC 진행 · 오픈소스 2종 운영
9. **프로젝트 쇼케이스** — AiIssueTriage · KubeAccessBroker · 배경화면 앱 30개 · AI 자동화 파이프라인 카드 (repo 링크)
10. **링크 허브 + CTA** — /resume · GitHub(snwlee) · Velog(iseon_u) · 이메일(pgrrr119@gmail.com)

## 콘텐츠 제약 (정직성 — 이력서 원칙 계승)

- 회사 내부 정보·고객사 실명 **금지**. 수치는 검증된 집계값만 (215/600/117/85/24/30/3000)
- 참여 수준 과장 금지 (K8s는 "참여", PoC는 "진행 중" 그대로)
- 미취득 자격증은 "준비 중" 표기

## 에러 처리

- 외부 fetch(GitHub·WakaTime) 실패 시: 콘솔 경고 + `stats.json` 캐시값 렌더 + "오프라인 스냅샷" 미세 라벨
- JS 비활성 환경: 콘텐츠는 전부 정적 HTML로 존재 (모션·라이브 데이터만 빠짐)

## 테스트 / 검증

- 반응형: 320 / 375 / 768 / 1024 / 1440 / 1920 스크린샷
- `prefers-reduced-motion` 동작 확인
- fetch 차단 상태(오프라인)에서 전체 렌더 확인
- Lighthouse (성능·접근성·SEO)
- 배포 후 실기기 확인

## 사용자 준비물 (구현과 병행)

- [ ] WakaTime 계정 + 에디터 플러그인 (데이터 수집 시작 — 섹션은 "수집 시작" 상태로 먼저 출시 가능)
- [ ] AWS 컨퍼런스 참여 이력 (연도·행사명)
- [ ] 양자 컨퍼런스 2회 (행사명·시기)
- [ ] AI 도입 시점 스토리 (언제부터, 어떤 계기)
- [ ] 현재 토큰 사용량 수치 (Claude/Codex 데스크탑에서 확인)

## 명시적 Out of Scope

- 영문판, 다크/라이트 토글(다크 고정), CMS, 방명록/댓글, 애널리틱스, 3D(WebGL)
- 토큰 사용량 자동 파이프라인 (수동 갱신으로 시작 — 추후 승격 가능)
