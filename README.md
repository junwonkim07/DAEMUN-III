# DAEMUN III — 인수인계 문서

대원 모의유엔(DAEMUN III) 컨퍼런스 웹사이트 모노레포. 공개 사이트, 콘텐츠 API, 공유 DB 스키마가 한 저장소에 있고 Vercel(web·api·admin) + Neon(Postgres) + Vercel Blob(업로드)에 올라간다 (§9).

이 문서는 **유지보수 담당자**와 **어드민 패널을 만들 사람**을 위한 것이다. 지금까지 내린 결정과 이유, 검증된 것, 아직 안 된 것을 전부 담았다. 코드 읽기 전에 이 문서를 끝까지 한 번 읽을 것.

---

## 0. 30초 요약

- 원래는 `web/` 하나짜리 Next.js 사이트였고 모든 콘텐츠가 `conference.ts`에 하드코딩돼 있었다.
- 2026-09-02에 모노레포로 재편하고, 콘텐츠를 PostgreSQL로 옮기고, Hono API를 만들고, 사이트가 API에서 읽도록 바꿨다.
- 어드민 패널은 `apps/admin`에 있고 Vercel `daemun-admin`으로 운영 중이다. 남은 화면은 `handover.md` §5.
- 로컬에서 Postgres + API + 사이트가 함께 돌아가고, 로그인 → 관리자 라우트 → 공개 페이로드까지 curl로 확인했다 (§11).
- 이력은 §12, 작업 규칙은 `CLAUDE.md`.

---

## 1. 현재 상태 (2026-09-02 기준)

| 영역 | 상태 |
|---|---|
| `apps/web` 공개 사이트 | 완성. 콘텐츠를 API에서 받아오도록 전환 완료. Announcements 페이지 추가됨 |
| `apps/api` 콘텐츠 API | 완성. 인증, 콘텐츠 CRUD, 파일 업로드, 캐시 무효화 웹훅 |
| `packages/db` 스키마·마이그레이션·시드 | 완성. 마이그레이션 7개 (`packages/db/drizzle/0000`–`0006`) |
| `packages/shared` zod 스키마·타입·기본 콘텐츠 | 완성 |
| 배포 | **Vercel + Neon + Blob 운영 중** (→ §9). 2026-09-11 VPS에서 이전 |
| `apps/admin` 어드민 패널 | 운영 중 (Vercel `daemun-admin`). 남은 화면은 `handover.md` §5 |

콘텐츠 자체는 대부분 `TBA` 플레이스홀더다 (날짜, 장소, 의제, 사무국 직책). 실제 값은 어드민 패널이 생기면 거기서 입력한다. **사무국 역할 배정은 사진·이름만 실제이고 직책은 임시**라는 점을 유의. 누가 어떤 직책인지는 반드시 확인 후 수정.

---

## 2. 저장소 구조

```
apps/
  web/          Next.js 16 공개 사이트           :3000
  admin/        Next.js 16 관리자 패널             :3001
  api/          Hono + better-auth + Drizzle API   :4000
packages/
  db/           Drizzle 스키마, SQL 마이그레이션, 시드
  shared/       zod 스키마 + TS 타입 + 기본 콘텐츠(defaultSite)
assets/source/  원본 미디어(영상, 문서, 프로필 사진). 서빙되지 않음
design/         디자인 캔버스 (.dc.html). 참고용
apps/*/vercel.json       Vercel 프로젝트 설정 (리전, 프레임워크, 빌드 명령)
docker-compose.dev.yml   로컬 개발용 postgres만
.claude/launch.json      개발 서버 실행 설정 (Claude Code용)
```

패키지 이름: `@daemun/web`, `@daemun/api`, `@daemun/db`, `@daemun/shared`. 워크스페이스 패키지는 빌드 없이 TS 소스를 그대로 export한다 (Next는 `transpilePackages`, API는 로컬에선 `tsx`, 프로덕션에선 esbuild 번들 — §9).

`apps/web/AGENTS.md`는 `next dev`가 자동으로 만드는 파일이다. 지우지 말 것.

---

## 3. 기술 결정과 이유

이 결정들은 프로젝트 오너(김준원)가 선택지를 보고 직접 고른 것이다.

| 결정 | 이유 |
|---|---|
| 모노레포 (pnpm workspaces) | web·api·admin이 같은 타입과 zod 스키마를 공유해야 함 |
| **Hono + Drizzle + PostgreSQL** | TypeScript 네이티브, 가볍고, 보일러플레이트가 적음. NestJS·Supabase·Next 내장 API 라우트도 후보였으나 이걸로 결정 |
| **better-auth 이메일+비밀번호** | 외부 의존 없음. 참가자 셀프 가입은 `delegate` 역할로만 허용(이메일 인증 필수), 관리자는 관리자가 발급. `admin` 플러그인으로 유저 관리 API까지 제공. Google 로그인은 선택 안 함 |
| **Vercel(web·api·admin) + Neon(Postgres) + Vercel Blob(업로드)** | 처음엔 VPS 한 대 + Docker Compose였으나 2026-09-11 이전. 전부 무료 티어, 관리할 서버 없음. API는 Hono 앱을 esbuild로 번들해 함수 하나로 올린다 (`apps/api/api/index.mjs`) |
| DB id는 `text` (uuid 타입 아님) | 시드 데이터가 `ecosoc`, `kim-junwon` 같은 읽기 쉬운 id를 쓸 수 있고, `packages/shared`의 기본 콘텐츠를 web 폴백과 시드에 동시에 재사용 가능. 새 행은 `crypto.randomUUID()` |
| web은 API 장애 시 `defaultSite`로 폴백 | 컨퍼런스 당일 API가 죽어도 사이트는 떠 있어야 함 |
| API에 CORS 없음 | 프론트가 Next.js rewrites로 `/api/*`, `/uploads/*`를 API에 프록시 → 브라우저 입장에선 전부 same-origin. 쿠키 문제도 사라짐 |
| 마이그레이션은 프로덕션 빌드 단계에서, 시드·첫 관리자는 로컬 부팅 시 | 서버리스엔 "부팅 한 번"이 없다. `apps/api/scripts/vercel-build.mjs`가 번들 전에 마이그레이션을 적용하고, `bootstrap()`은 로컬 `pnpm dev:api`에서만 돈다 |
| API는 로컬은 `tsx`로 소스 직접 실행, 프로덕션은 esbuild 번들 하나(`dist/app.mjs`) | 서버리스에선 확장자 없는 TS import가 ESM으로 안 풀려 번들이 필요하다 (`apps/api/api/index.mjs` 주석). 빌드는 `scripts/vercel-build.mjs` |
| 어드민 패널은 이번에 안 만듦 | 오너 요청. 기반과 API만 정리하고 UI는 다음 담당자에게 |

---

## 4. 로컬 개발

필요: Node 22, pnpm 10, Docker Desktop.

```bash
pnpm install
pnpm db:up          # Postgres (localhost:5432, daemun/daemun)
pnpm dev:api        # 첫 실행 시 마이그레이션 + 시드 + 관리자 생성 → :4000
pnpm dev:web        # :3000, http://localhost:4000 을 읽음
```

`pnpm dev`로 둘 다 동시에 띄울 수 있다.

로컬 env 파일 (git에 안 올라감, 직접 만들 것):

```
# apps/api/.env
ADMIN_EMAIL=admin@daemun.local
ADMIN_PASSWORD=daemun-admin        # 8자 이상
REVALIDATE_SECRET=dev

# apps/web/.env.local
SKIPER_LICENSE_KEY=...             # skiper-ui 컴포넌트 라이선스. 기존 담당자에게 받을 것
REVALIDATE_SECRET=dev              # api와 같아야 즉시 캐시 무효화가 동작
```

유용한 명령:

```bash
pnpm typecheck        # 전체 타입체크
pnpm db:generate      # schema.ts 수정 후 SQL 마이그레이션 생성
pnpm db:studio        # Drizzle Studio로 DB 보기
curl localhost:4000/api/public/site | jq   # 사이트가 받는 페이로드 확인
```

---

## 5. 데이터 모델 (`packages/db/src/schema.ts`)

모든 콘텐츠 테이블은 `id text`, `sort_order int`, `created_at`, `updated_at`를 가진다. 순서는 항상 `sort_order asc, created_at asc`.

| 테이블 | 내용 | 관계 |
|---|---|---|
| `conference` | 회의 기본 정보 + 소개 문구. **id = "main" 한 행만** | – |
| `committees` | 위원회 (slug, code, name, image, 출처 링크) | – |
| `topics` | 의제. `report`는 chair report PDF 경로 (null이면 "available September") | → committees (cascade) |
| `departments` | 사무국 부서 | – |
| `people` | 모든 인물. `section` enum: `director` / `executive` / `department` / `chair` | → departments, committees (set null) |
| `resolutions` | 결의안. `status`: `approved` / `review` / `awaiting`. 컨퍼런스 중 실시간으로 바뀜 | → committees, topics (cascade) |
| `schedule_days` / `schedule_items` | 일정 | items → days (cascade) |
| `documents` | 가이드 페이지 다운로드 문서 목록 | – |
| `user`, `session`, `account`, `verification` | better-auth 테이블. `user.role`, `banned` 등은 admin 플러그인 컬럼 | – |

`people.section`에 따라 연결이 다르다: `department`면 `departmentId`, `chair`면 `committeeId`를 채운다. 공개 API가 이걸 `secretariat.departments[].members`, `secretariat.chairs[slug]`로 조립한다.

스키마 변경 절차: `schema.ts` 수정 → `pnpm db:generate` → 생성된 SQL을 `packages/db/drizzle/`에 커밋. 로컬은 API 부팅 시, 프로덕션은 `daemun-api` 빌드 단계(`vercel-build.mjs`)에서 적용된다. zod 스키마(`packages/shared/src/schemas.ts`)도 같이 맞출 것.

### DB에 없는 콘텐츠 (MDX로 관리)

| 내용 | 위치 | 수정 방법 |
|---|---|---|
| Guide to MUN 본문 | `apps/web/src/content/guide/*.mdx` | 파일 직접 수정 후 배포 |
| Announcements | `apps/web/src/content/announcements/*.mdx` | 새 `.mdx` 추가 + `index.ts`에 import. `meta = { title, date, urgent }`. 긴급은 상단 고정 |

즉 공지와 가이드는 **코드 배포가 필요**하다. 어드민에서 편집하고 싶으면 테이블을 추가해야 한다 (§8 남은 일).

---

## 6. API (`apps/api`)

```
GET   /health
GET   /uploads/*                     업로드 파일 서빙 (UPLOAD_DRIVER=local일 때만 — 프로덕션은 Blob 절대 URL이라 404)
*     /api/auth/*                    better-auth
GET   /api/public/site               공개 사이트용 전체 페이로드 (SiteData)
*     /api/admin/*                   관리자 전용 (세션 + role=admin 필요)
```

### 관리자 라우트

`conference`와 `uploads`만 손으로 짰고 나머지는 `lib/crud.ts` 팩토리가 같은 5개 라우트를 만든다.

| 경로 | 비고 |
|---|---|
| `GET / PATCH  /api/admin/conference` | 싱글톤 |
| `GET /api/admin/site` | 공개 사이트가 받을 페이로드 미리보기 |
| `/api/admin/committees` | |
| `/api/admin/topics` | |
| `/api/admin/departments` | |
| `/api/admin/people` | |
| `/api/admin/resolutions` | |
| `/api/admin/schedule/days` | |
| `/api/admin/schedule/items` | |
| `/api/admin/documents` | |
| `POST /api/admin/uploads` | multipart, 필드명 `file` (로컬 드라이버 경로) |
| `GET /api/admin/uploads/config` · `POST /api/admin/uploads/token` | 브라우저→Blob 직업로드 (프로덕션; 함수 바디 4.5MB 상한 우회, 25MB까지) |
| `POST /api/admin/uploads/gc` | 어느 행도 참조하지 않는 업로드 객체 정리 |

CRUD 테이블마다:

```
GET    /            목록 (정렬됨)
POST   /            생성 — body는 shared의 *CreateSchema. sortOrder 생략 시 맨 뒤
PATCH  /:id         부분 수정 — *UpdateSchema (전부 optional)
DELETE /:id
PUT    /reorder     { ids: string[] } → 배열 순서대로 sortOrder 재설정
```

요청 검증은 `@hono/zod-validator` + `packages/shared`의 스키마. 검증 실패 400 (zod 에러), 인증 실패 401, 권한 없음·밴 403. 응답 타입은 전부 `@daemun/shared`에 있으니 어드민 프론트는 그걸 import하면 된다.

업로드 응답:

```json
{ "url": "https://<store>.public.blob.vercel-storage.com/<uuid>.pdf", "originalName": "x.pdf", "kind": "PDF", "bytes": 12345, "size": "12 KB" }
```

허용 확장자: jpg, jpeg, png, webp, pdf, doc, docx. 기본 25MB (`MAX_UPLOAD_MB`; 프로덕션은 직업로드 토큰의 `maximumSizeInBytes`로 스토어가 강제). 로컬 드라이버의 `url`은 `/uploads/<uuid>.pdf`. `url`을 그대로 `people.photo`, `topics.report`, `resolutions.document`, `documents.file`에 넣으면 된다. `size` 문자열은 `documents.size`용.

### 유저 관리

별도 라우트 없음. better-auth admin 플러그인 엔드포인트를 쓴다 (관리자 세션 필요):

```
POST /api/auth/sign-in/email         { email, password }
POST /api/auth/sign-out
GET  /api/auth/get-session
POST /api/auth/admin/create-user     { email, password, name, role: "admin" }
POST /api/auth/admin/list-users
POST /api/auth/admin/set-role
POST /api/auth/admin/ban-user / unban-user
POST /api/auth/admin/remove-user
```

클라이언트에서는 `better-auth/react`의 `createAuthClient({ plugins: [adminClient()] })`를 쓰면 위 엔드포인트가 메서드로 나온다. 공개 회원가입(`/sign-up/email`)은 열려 있다 — role은 항상 `delegate`(입력 불가), 이메일 인증 후 로그인 가능. 관리자는 `admin/create-user` 또는 `set-role`로만.

### 캐시 무효화 흐름

1. `web`은 `GET /api/public/site`를 `next: { revalidate: 60, tags: ["site"] }`로 fetch (`apps/web/src/lib/site.ts`)
2. 관리자 라우트에서 뭔가 바뀌면 API가 `POST {WEB_URL}/api/revalidate` 호출 (편집마다 1회, `waitUntil`로 응답 뒤에도 완료 보장, fire-and-forget, `lib/revalidate.ts`; 호스팅된 API에서는 `WEB_URL`이 web의 공개 origin이어야 함)
3. web의 라우트 핸들러가 `x-revalidate-secret` 검사 후 `revalidateTag("site", { expire: 0 })` → 다음 방문자부터 새 데이터

`REVALIDATE_SECRET`이 비어 있으면 웹훅을 안 보내고 60초 주기 갱신만 된다.

---

## 7. 인증 동작 방식 — 어드민 패널 만들 때 필수

- 인증은 API에 있고 `/api/auth/*`로 노출된다. 쿠키 이름은 `better-auth.session_token` (https에선 `__Secure-` 접두사).
- **어드민 프론트는 `/api/*`와 `/uploads/*`를 API로 rewrite해야 한다.** 그래야 세션 쿠키가 어드민 도메인의 first-party 쿠키가 된다. Next.js면 `next.config.ts`의 `rewrites()`에서 `destination: \`${API_URL}/api/:path*\``.
- API의 `ADMIN_URL` 환경변수 = 어드민 프론트의 공개 origin (예: `https://admin.daemun.org`). better-auth의 `baseURL`이자 `trustedOrigins`라서 **이게 틀리면 CSRF 검사에서 전부 막힌다.** 로컬 기본값은 `http://localhost:3001`.
- 프로덕션의 `ADMIN_URL`은 Vercel `daemun-api`의 환경변수다 (`https://daemun-admin.vercel.app`). 도메인이 바뀌면 여기와 `WEB_PUBLIC_URL`·`WEB_URL`을 같이 바꾸고 api를 재배포.
- 첫 관리자는 **로컬 부팅 시에만** `ADMIN_EMAIL` / `ADMIN_PASSWORD`로 자동 생성된다 (user 테이블이 비어 있을 때). 프로덕션엔 부팅이 없으니 기존 관리자가 `admin/create-user`·`set-role`로 발급한다.
- `requireAdmin` 미들웨어(`apps/api/src/middleware/auth.ts`)가 세션·밴·role을 검사한다. 어드민 프론트에서 라우트 보호는 쿠키 존재 여부만 낙관적으로 확인하고 (Next 16은 `proxy.ts`), 실제 권한은 API가 판단하게 두면 된다.

curl로 직접 확인하는 법 (`/api/auth/*`는 Origin 헤더가 `ADMIN_URL`과 같아야 CSRF 검사를 통과한다. `/api/admin/*`는 쿠키만 있으면 된다):

```bash
curl -c cj.txt -H "Origin: http://localhost:3001" -H "Content-Type: application/json" \
  -d '{"email":"admin@daemun.local","password":"daemun-admin"}' \
  localhost:4000/api/auth/sign-in/email
```

```bash
curl -b cj.txt localhost:4000/api/admin/conference
```

```bash
curl -b cj.txt -H "Origin: http://localhost:3001" -X PATCH -H "Content-Type: application/json" \
  -d '{"dates":"14–15 November 2026"}' localhost:4000/api/admin/conference
```

---

## 8. 어드민 패널 — 남은 일

만들어야 할 화면 (전부 API가 이미 지원):

| 화면 | 쓰는 API |
|---|---|
| 로그인 | `sign-in/email` |
| 회의 정보 (폼) | `conference` |
| 사무국 (부서 + 인물, 사진 업로드, 순서 변경) | `departments`, `people`, `uploads`, `reorder` |
| 위원회 + 의제 (chair report PDF 업로드) | `committees`, `topics`, `uploads` |
| **결의안 현황판** (컨퍼런스 중 실시간 사용. 상태 변경 + PDF 업로드가 핵심) | `resolutions`, `uploads` |
| 일정 | `schedule/days`, `schedule/items` |
| 문서 | `documents`, `uploads` |
| 관리자 계정 | `auth/admin/*` |
| 미리보기 | `admin/site` |

권장 구성: `apps/admin`에 Next.js 16 앱 (web과 같은 Tailwind v4 스택), `@daemun/shared` 타입 사용, 데이터 fetch는 `@tanstack/react-query`. 배포는 Vercel 프로젝트 `daemun-admin`(§9); 도메인이 바뀌면 `daemun-api`의 `ADMIN_URL`을 그 도메인으로 (§7).

기타 남은 일:

- `apps/web/src/content/guide/documents.mdx`는 아직 문서 링크가 정적이다. `documents` 테이블을 쓰도록 바꿀지 결정 필요 (지금은 DB와 MDX 양쪽에 같은 목록이 있음).
- Announcements를 어드민에서 쓰고 싶으면 테이블 + CRUD 추가 (`lib/crud.ts` 팩토리에 스키마 하나 넘기면 끝).
- `ScheduleTimeline` 컴포넌트는 만들어져 있지만 어느 페이지에서도 안 쓴다. `schedule` 데이터도 API는 내려주지만 사이트에 표시 안 됨.
- DB 백업. Neon Free의 시점 복구 창은 짧다 — 주기적 `pg_dump`를 어딘가에 걸 것.

---

## 9. 배포 (Vercel + Neon + Blob)

프로젝트 3개가 한 저장소를 root directory만 다르게 본다: `daemun-web` → `apps/web`, `daemun-api` → `apps/api`, `daemun-admin` → `apps/admin`. 설정은 각 `apps/*/vercel.json`(리전 `sin1`, 프레임워크, 빌드 명령)과 Vercel 프로젝트 환경변수에 있다.

- **자동 배포 — 2026-09-11 현재 꺼져 있음**: `.github/workflows/deploy.yml`은 GitHub 시크릿 `VERCEL_TOKEN`이 있을 때만 main 머지에 `vercel deploy --prod`(api → web → admin)를 돌리고, 없으면 안내만 찍고 green으로 끝난다. 토큰을 넣거나(Vercel → Account Settings → Tokens), 각 Vercel 프로젝트 Settings → Git에서 이 저장소를 연결하면(계정 GitHub Login Connection 선행) push마다 Vercel이 직접 배포하고 PR마다 프리뷰가 생긴다 — 그땐 워크플로우를 지운다(둘 다 있으면 두 번 배포). 프리뷰 API 빌드는 마이그레이션을 건너뛰지만 프로덕션 DB를 공유한다.
- **수동 배포**: 레포 루트에서 `vercel link --project <이름> --scope junwon-9966` 후 `vercel deploy --prod`. 서브디렉터리에서 돌리면 그 디렉터리만 올라가 실패한다.
- **API 빌드** (`apps/api/scripts/vercel-build.mjs`): 프로덕션이면 `MIGRATE_DATABASE_URL`(direct 엔드포인트)로 마이그레이션 적용 → esbuild로 `dist/app.mjs` 번들 → `api/index.mjs`가 그걸 import. 프리뷰는 마이그레이션을 건너뛴다.
- **환경변수** (`.env.example` 참고): api — `DATABASE_URL`(pooled) `MIGRATE_DATABASE_URL` `DB_POOL_MAX=5` `UPLOAD_DRIVER=blob` `BLOB_READ_WRITE_TOKEN`(스토어 연결 시 자동) `BETTER_AUTH_SECRET` `REVALIDATE_SECRET` `ADMIN_URL` `WEB_PUBLIC_URL` `WEB_URL` (+ SMTP). web — `API_URL` `REVALIDATE_SECRET`. admin — `API_URL`. 바꾸면 해당 프로젝트 재배포.
- **로그**: `vercel logs https://daemun-api.vercel.app` (Hobby는 1시간 보관). SMTP가 비어 있으면 가입 인증·비밀번호 재설정 링크가 여기 찍힌다.
- **데이터**: Neon 콘솔(프로젝트 `daemun-iii`)에서 SQL·브랜치·복구. 업로드 파일은 Vercel 대시보드 → Storage → `daemun-uploads`. 어드민 Overview의 "Clean up unused uploads"가 고아 객체를 정리한다.
- **한도** (Hobby/Free): 전송량 100GB/월, 함수 호출 100만/월, Neon 0.5GB·100 CU-시간/월(5분 유휴 시 잠듦 → 첫 요청 ~3초), Blob 한도 초과 시 과금 대신 차단. 히어로 영상이 데스크톱 방문당 ~2MB라 월 수만 방문은 여유.

환경변수 전체 목록은 `.env.example`과 `apps/api/src/env.ts`.

---

## 10. 함정 / 알아둘 것

- **Next.js 16은 학습 데이터의 Next와 다르다.** `middleware.ts` → `proxy.ts`, `revalidateTag`는 2번째 인자 필수, 캐시 모델 변경 등. `apps/web/node_modules/next/dist/docs/`를 읽고 작업할 것.
- web의 `layout.tsx`는 `export const revalidate = 60` (ISR). 어드민 저장 시 API가 `POST /api/revalidate`로 즉시 무효화하므로 반영은 바로 된다. 빌드 시 API에 못 닿으면 `getSite()`가 `defaultSite`로 폴백하고 첫 재검증에서 실데이터로 바뀐다.
- pnpm 10은 postinstall을 기본 차단한다. 네이티브 빌드가 필요한 패키지를 추가하면 `pnpm-workspace.yaml`의 `onlyBuiltDependencies`에 넣어야 한다.
- `apps/web/src/app/main.gif` (91MB)는 gitignore. 사이트는 `public/main.mp4`를 쓴다.
- skiper-ui 컴포넌트(`apps/web/src/components/ui/skiper-ui/`)는 유료 라이선스. `SKIPER_LICENSE_KEY` 필요.
- 시드는 `conference` 테이블이 비어 있을 때만 돈다. 초기화하려면 DB를 지우거나 `data/postgres*`를 삭제.
- `packages/shared/src/default-site.ts`는 **시드 원본이자 web의 폴백**이다. DB가 시드된 뒤엔 여기 고쳐도 사이트에 반영 안 된다. 어드민에서 고칠 것.
- 프로필 사진 등 기존 정적 파일은 `apps/web/public/`에 있고 DB엔 `/profiles/x.jpg` 경로로 들어가 있다. 새로 올리는 파일은 `/uploads/...`. 둘 다 web에서 same-origin 경로로 동작한다.
- Windows에서 `git mv web apps/web`이 파일 잠금으로 한 번 실패했다가 재시도로 성공했다. 비슷한 일이 생기면 dev 서버를 끄고 다시 시도.

---

## 11. 검증된 것 (2026-09-02, 로컬)

- `pnpm install`, `pnpm typecheck` 통과
- `docker-compose.dev.yml`로 Postgres 기동 → API 부팅 시 마이그레이션·시드·관리자 생성 확인
- `GET /health`, `GET /api/public/site` 정상
- `sign-in/email` → 세션 쿠키 발급 → `GET /api/admin/conference` 200 확인
- 사이트(`:3000`)가 API 데이터로 렌더링됨 (Secretariat, Committees, Resolutions)

2026-09-11 Vercel 프로덕션에서 재검증: 25MB 직업로드·26MB 거부·타입 위조 거부, 가입 → 인증 링크 → 로그인 → 세션 쿠키 왕복, ISR 캐시(`X-Vercel-Cache: PRERENDER`), 빌드 단계 마이그레이션, 함수 리전 `sin1`.

---

## 12. 작업 이력

- **이전**: `web/` 단일 Next.js 16 사이트. 콘텐츠는 `web/src/lib/conference.ts` 하드코딩. 커밋 `869fb82`.
- **2026-09-02**: 모노레포 재편. `web → apps/web`, 루트 미디어 → `assets/source/`. `packages/shared`(zod 스키마, 타입, `defaultSite`), `packages/db`(Drizzle), `apps/api`(Hono) 신규. web 페이지를 `getSite()` 기반으로 전환, `conference.ts` 삭제. Docker Compose + Caddy 구성. Announcements 페이지(MDX) 추가. 어드민 패널은 오너 요청으로 제외.
