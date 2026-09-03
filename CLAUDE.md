# DAEMUN III

읽는 순서: 이 파일 → `handover.md` (전체 배경·결정 이유·현재 상태) → 작업 대상에 따라 관련 §.

## 절대 규칙

- **스키마 변경**: `packages/db/src/schema.ts` 수정 → `pnpm db:generate` → 생성된 SQL을 `packages/db/drizzle/`에 커밋. `packages/shared/src/schemas.ts`(zod)도 같이 맞출 것 — 타입이 web·api·admin에 다 퍼진다.
- **새 CRUD 리소스**는 손으로 라우트 짜지 말고 `apps/api/src/lib/crud.ts` 팩토리(`crudRoutes({ table, create, update, orderBy? })`)를 쓴다.
- **커밋 전 `pnpm typecheck`** (루트에서 전체 워크스페이스, 또는 `pnpm --filter <pkg> typecheck`로 범위 좁혀서).
- `apps/web/AGENTS.md`는 `next dev`가 자동 생성하는 파일이다. 지우지 말 것.
- **Next.js 16은 학습 데이터의 Next와 다르다.** `middleware.ts` → `src/proxy.ts`(함수명도 `proxy`), `revalidateTag(tag, opts)`는 2번째 인자 필수, 캐시 모델 변경. 작업 전 해당 앱의 `node_modules/next/dist/docs/`를 확인할 것.
- **Git 워크플로 (포크 기반)**: upstream `junwonkim07/DAEMUN-III`에는 **쓰기 권한 없음** (`MINBBBB1201`은 READ). 절대 `main`에 직접 커밋·push 금지. **main 머지는 곧 프로덕션 배포다** (`.github/workflows/deploy.yml`). 흐름:
  1. 기능 브랜치 생성 → 작업 → 커밋 전 `pnpm -r typecheck` + `pnpm -r lint` 로컬 통과
  2. `origin`(= 내 포크 `MINBBBB1201/DAEMUN-III`)에 push
  3. `gh pr create --repo junwonkim07/DAEMUN-III --head MINBBBB1201:<branch> --base main`
  4. CI 확인: `gh pr checks <n> --repo junwonkim07/DAEMUN-III` (`.github/workflows/ci.yml`: typecheck·lint·build). 포크 첫 기여는 메인테이너가 "Approve and run" 눌러줘야 CI가 돈다.
  5. `git fetch upstream` → `upstream/main`이 움직였으면 `git rebase upstream/main` → force-push → CI 재확인
  6. **머지는 준원(junwonkim07, 저장소 오너)이 컨펌하고 한다.** Claude는 upstream에 머지 못 함 — CI green 뜨면 "머지 준비됨"만 알린다.
  - 리모트: `upstream` = junwonkim07(fetch용), `origin` = MINBBBB1201 포크(push용).
  - `gh`는 PATH에 없을 수 있음 → `"/c/Program Files/GitHub CLI/gh.exe"` 전체 경로 또는 PowerShell에서 `$env:Path` 갱신 후 사용.
  - 스택 브랜치(안 머지된 기능 브랜치 위에서 딴 브랜치): 아래 브랜치 PR이 머지되기 전엔 위 브랜치 PR을 열지 말 것 (포크 전용 브랜치는 base로 못 씀). push만 해두고 대기.
- 줄바꿈은 LF로 고정돼 있다 (`.gitattributes`). Windows에서 `git status`가 레포 전체를 "수정됨"으로 보여주면 `core.autocrlf`를 의심할 것 — 실제 내용 변경이 아닐 가능성이 높다.

## 저장소 구조

```
apps/
  web/    Next.js 16 공개 사이트                :3000
  api/    Hono + better-auth + Drizzle API      :4000
  admin/  Next.js 16 관리자 패널                 :3001
packages/
  db/       Drizzle 스키마, SQL 마이그레이션, 시드
  shared/   zod 스키마 + TS 타입 + 기본 콘텐츠(defaultSite)
```

## 지금 상태 (자세한 건 handover.md)

- `apps/web`, `apps/api`, `packages/*`: 완성.
- `apps/admin`: 스캐폴딩 + **결의안 현황판**(`/dashboard/resolutions`) 완료. Docker/compose/Caddy 배포 경로 포함 — main 머지 시 `admin` 서비스로 같이 배포된다. `handover.md` §5 우선순위(로그인 ✅ → 결의안 현황판 ✅ → **사무국** → 회의정보 → 위원회·의제 → 나머지) 순서로 이어서 만들 것.
  - 패턴: 데이터는 `useSite()`(react-query, `GET /api/admin/site`), 변경은 `lib/api.ts`의 `adminFetch`/`uploadFile` + 리소스별 react-query 뮤테이션에서 site 캐시 무효화. 인증 화면은 `/dashboard/*` 아래 두면 `proxy.ts` + `DashboardShell`이 보호.
- `handover.md` §6에 09-02 사무국 회의에서 나온 신규 요구사항(결의안 제출 시스템, 공지 CRUD)이 정리돼 있다. 특히 §6-1의 `defaultRole` 함정을 반드시 읽을 것 — 참가자 셀프 가입을 열 때 `defaultRole`을 `"admin"`에서 `"delegate"`로 바꾸지 않으면 가입자가 전부 관리자가 된다.

## 로컬 개발

```bash
pnpm install
pnpm db:up
pnpm dev:api      # :4000, 첫 실행에 마이그레이션·시드·첫 관리자 생성
pnpm dev:web      # :3000
pnpm dev:admin    # :3001
```

`apps/admin/.env.local`(git에 안 올라감):

```
API_URL=http://localhost:4000
```
