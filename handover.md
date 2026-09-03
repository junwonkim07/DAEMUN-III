
# DAEMUN III — 어드민 패널 인수인계

어드민 패널(대시보드)을 만들 사람을 위한 문서. 배경·결정 이유·전체 구조는 [README.md](README.md)에 있고, 여기는 **패널 만드는 데 필요한 것만** 추렸다.

읽는 순서: 이 문서 → README §6–§7 (API·인증) → `packages/shared/src/schemas.ts` (타입) → `apps/api/src/routes/admin.ts`.

---

## 0. 운영 환경 (2026-09-03 기준)

| | 값 |
|---|---|
| 서버 | VPS `104.36.69.86` (Debian 13, 2 vCPU, RAM 1GB + swap 3.6GB). SSH는 김준원의 키로만 접속 |
| 사이트 | http://104.36.69.86 |
| API | http://104.36.69.86:8080 — `GET /health`, `GET /api/public/site` 로 확인 |
| 스택 | `/opt/daemun`에 클론된 이 저장소 + `docker-compose.yml` (postgres, api, web, caddy). 데이터는 `/opt/daemun/data/` |
| 배포 | **main에 머지되면 GitHub Actions가 자동 배포** (`.github/workflows/deploy.yml`). 이미지 빌드가 서버에서 돌기 때문에 3분 정도 걸리고, 그동안 서버가 잠깐 느려질 수 있다 |
| 도메인 | 아직 없음. 생기면 서버 `.env`의 `WEB_DOMAIN`, `API_DOMAIN`만 바꾸면 Caddy가 HTTPS 자동 발급 |
| 관리자 계정 | `admin@daemun.local`. 비밀번호는 서버 `/opt/daemun/.env`의 `ADMIN_PASSWORD` — 김준원에게 요청 |

**어드민 패널 개발자에게 특히 중요한 것:**

- 서버 `.env`의 `ADMIN_URL`은 지금 **`http://104.36.69.86:8080`(API 자기 자신)** 으로 되어 있다. 패널이 배포되면 이 값을 **패널의 origin**으로 바꿔야 로그인이 된다 (§3). 로컬 개발은 기본값 `http://localhost:3001`이라 그대로 되고, 프로덕션 API에 로컬 패널을 붙여 테스트하는 건 CSRF 때문에 안 된다 — 로컬 API를 띄워서 개발할 것.
- 패널을 같은 서버에 올릴 계획이면 `docker-compose.yml`에 `admin` 서비스와 `deploy/Caddyfile`에 사이트 하나를 추가하면 된다. 그러면 기존 워크플로우가 그대로 같이 배포한다. 다만 RAM 1GB라 Next 앱 두 개를 동시에 빌드하면 빡빡하다 — 문제 되면 GitHub Actions에서 이미지를 빌드해 서버는 pull만 하도록 바꾸는 게 다음 단계.
- 프로덕션 DB는 이미 실제 사무국 명단·인사말로 채워져 있다. `packages/shared/src/default-site.ts`는 더 이상 진실이 아니고, 콘텐츠의 진실은 DB다.

---

## 1. 지금 상태

|                          | 상태                                                                     |
| ------------------------ | ------------------------------------------------------------------------ |
| 공개 사이트`apps/web`  | 완성. API에서 콘텐츠 읽음, API 죽으면`defaultSite`로 폴백              |
| API`apps/api`          | 완성. 인증 + 모든 콘텐츠 CRUD + 파일 업로드 + 캐시 무효화                |
| DB`packages/db`        | 완성. 마이그레이션 1개, 부팅 시 자동 마이그레이션·시드                  |
| **어드민 패널 UI** | **없음 — 당신이 만든다.** API는 패널에 필요한 모든 것을 이미 제공 |
| 실제 VPS 배포            | **운영 중.** http://104.36.69.86 (사이트), http://104.36.69.86:8080 (API). main 머지 시 자동 배포 (§0) |

콘텐츠는 대부분 `TBA` 플레이스홀더. 사무국 **직책 배정은 맞음...!**— 그러나 패널에서 향후 MUN 개최시 수정 가능하게 만드는것

---

## 2. 로컬에서 띄우기

필요: Node 22, pnpm 10, Docker Desktop.

```bash
pnpm install
pnpm db:up        # Postgres localhost:5432 (daemun/daemun)
pnpm dev:api      # :4000 — 첫 실행에 마이그레이션·시드·첫 관리자 생성
pnpm dev:web      # :3000
```

`apps/api/.env`:

```
ADMIN_EMAIL=admin@daemun.local
ADMIN_PASSWORD=daemun-admin     # 8자 이상
REVALIDATE_SECRET=dev
```

패널은 `apps/admin`으로 만들고 **포트 3001**을 쓸 것 (API의 `ADMIN_URL` 기본값이 `http://localhost:3001`).

---

## 3. 인증 — 이 세 가지를 틀리면 아무것도 안 된다

1. **패널은 `/api/*`와 `/uploads/*`를 API로 rewrite해야 한다.** 세션 쿠키가 패널 도메인의 first-party 쿠키가 되어야 하기 때문. Next.js면:

   ```ts
   // next.config.ts
   async rewrites() {
     const api = process.env.API_URL ?? "http://localhost:4000";
     return [
       { source: "/api/:path*", destination: `${api}/api/:path*` },
       { source: "/uploads/:path*", destination: `${api}/uploads/:path*` },
     ];
   }
   ```

   그러면 패널 코드에서는 그냥 `fetch("/api/admin/...")`.
2. **API의 `ADMIN_URL` = 패널의 공개 origin.** better-auth의 `baseURL`이자 `trustedOrigins`라서 틀리면 CSRF 검사에서 전부 403. 로컬은 `http://localhost:3001`, 배포 시 서버 `.env`의 `ADMIN_URL`을 패널 origin(예: `https://admin.<도메인>`)으로 바꾼다. 지금은 API 자기 자신(`http://104.36.69.86:8080`)을 가리킨다.
3. **클라이언트는 `better-auth/react`를 쓴다.**

   ```ts
   import { createAuthClient } from "better-auth/react";
   import { adminClient } from "better-auth/client/plugins";
   export const auth = createAuthClient({ plugins: [adminClient()] });
   // auth.signIn.email({ email, password }), auth.useSession(), auth.admin.createUser(...)
   ```

   공개 회원가입은 꺼져 있다. 계정은 관리자가 `auth.admin.createUser`로 발급.

라우트 보호는 패널에서 쿠키 유무만 낙관적으로 보고(Next 16은 `proxy.ts`), 실제 권한은 API의 `requireAdmin`(세션·밴·`role === "admin"`)이 판단한다. 401 → 로그인 페이지로, 403 → 권한 없음 화면.

---

## 4. API 치트시트

base: `/api/admin` (관리자 세션 필요). 응답 타입은 전부 `@daemun/shared`에서 import.

| 리소스    | 경로                                    | 비고                                                             |
| --------- | --------------------------------------- | ---------------------------------------------------------------- |
| 회의 정보 | `GET/PATCH /conference`               | 싱글톤 (id`"main"`)                                            |
| 미리보기  | `GET /site`                           | 공개 사이트가 받는`SiteData` 그대로                            |
| 위원회    | `/committees`                         |                                                                  |
| 의제      | `/topics`                             | `report` = chair report PDF 경로                               |
| 부서      | `/departments`                        |                                                                  |
| 인물      | `/people`                             | `section`: `director`/`executive`/`department`/`chair` |
| 결의안    | `/resolutions`                        | `status`: `awaiting`/`review`/`approved`                 |
| 일정      | `/schedule/days`, `/schedule/items` |                                                                  |
| 문서      | `/documents`                          |                                                                  |
| 업로드    | `POST /uploads`                       | multipart, 필드명`file`                                        |

CRUD 리소스는 전부 같은 5개:

```
GET    /            목록 (sort_order asc)
POST   /            생성 — body: shared의 *CreateSchema. sortOrder 생략 시 맨 뒤
PATCH  /:id         부분 수정 — *UpdateSchema (모두 optional)
DELETE /:id
PUT    /reorder     { ids: string[] } — 드래그 정렬 후 순서대로 보내면 끝
```

에러: 400 (zod 에러 그대로), 401 미로그인, 403 권한 없음·밴.

업로드 응답 `{ url, originalName, kind, bytes, size }`. `url`(`/uploads/<uuid>.ext`)을 그대로 `people.photo` / `topics.report` / `resolutions.document` / `documents.file`에 넣는다. 허용: jpg jpeg png webp pdf doc docx, 25MB.

**저장하면 공개 사이트는 자동 갱신된다** (API가 web에 revalidate 웹훅 → 즉시 반영). 패널에서 따로 할 일 없음.

---

## 5. 만들 화면 (우선순위 순)

1. **로그인**
2. **결의안 현황판** — 컨퍼런스 당일 실시간으로 쓰는 핵심 화면. 위원회별 의제 목록, 상태 변경 버튼, PDF 업로드. 이것만 있어도 당일 운영 가능.
3. **사무국** — 부서·인물 CRUD, 사진 업로드, 드래그 정렬. 직책 배정 수정이 첫 실사용
4. **회의 정보** — 날짜·장소·연락처 폼 (지금 전부 TBA)
5. **위원회·의제** — chair report PDF 업로드 (9월에 올림)
6. 일정, 문서, 관리자 계정, 미리보기

권장: `apps/admin`에 Next.js 16 + Tailwind v4 (web과 동일 스택), `@daemun/shared` 타입, fetch는 `@tanstack/react-query`. 디자인은 사이트와 맞출 필요 없음 — 관리 도구다.

---

## 6. 새 요구사항 (09-02 사무국 회의)

회의록 출처: 09-02 김준원 ↔ 사무국 담당자 회의 (Plaud 녹음, 앞 6분 40초 기준. 뒷부분에 공지·관리자 패널 논의가 더 있을 수 있으니 원본 확인). **지금 API로는 안 되고 스키마·라우트 확장이 필요한 것**과 **사이트 쪽에서 아직 안 한 것**을 나눴다.

### 6-1. 결의안 제출 시스템 (핵심, API 확장 필요)

회의에서 확정된 흐름:

1. 참가자(팀장)가 **직접 계정을 만들고 로그인**한다. 회의록 원문은 "로그인 회원가입 창을 만들어서 계정을 만들라고 해" — 즉 **셀프 회원가입**. 지금 API는 `disableSignUp: true`라 관리자 발급만 되므로, 참가자용 가입은 열되 `role`이 `admin`이 되지 않게 해야 한다 (아래 주의).
2. 팀장이 완성한 결의안 PDF를 마이페이지 또는 Resolutions 페이지의 Upload 버튼으로 올린다.
3. 올린 파일은 **사무국·의장만 볼 수 있고 다른 팀에게는 비공개**. 사무국은 각 팀의 진행 상황(올렸는지, 리뷰 중인지)을 볼 수 있어야 한다.
4. 상태 3단계: 미제출(`awaiting`) / 리뷰 중(`review`) / 승인(`approved`). 현재 enum과 동일.
5. **승인돼도 아직 공개 아님.** 당일 오프닝 → Lobbying/Merging 세션에 Approval Panel이 열리고, 2층에서 한 팀씩 검토·승인. 점심 후 **13:00 디베이트 시작 시 4개 토픽 결의안을 한 번에 전체 공개**.
6. 토픽은 위원회당 4개 고정. **한 토픽에서 팀이 둘로 갈리면 결의안이 2개** 나올 수 있다. 일단 1개로 가정하되 2개도 막히면 안 됨.

필요한 확장:

- 참가자 role. `user.role`에 `"delegate"`(또는 `"team"`) 추가, 팀 ↔ 위원회/의제 매핑 테이블. **주의: `apps/api/src/auth.ts`의 admin 플러그인이 `defaultRole: "admin"`이라 가입·`createUser`에 role을 안 넘기면 관리자가 된다.** 셀프 가입을 열면 `defaultRole`을 반드시 `"delegate"`로 바꿀 것. `requireAdmin`은 `role === "admin"`만 통과시키므로 참가자용 라우트는 별도 미들웨어.
- `POST /api/delegate/resolutions/:topicId/upload` — 본인 팀 의제에만, 파일은 `resolutions.document`로, 상태는 `review`로.
- `resolutions.publishedAt`(또는 `visibility`) — 공개 API(`/api/public/site`)는 `approved` **이고** 공개된 것만 `document`를 내려준다. 지금은 approved면 바로 다운로드 링크가 뜬다 (`apps/web/src/app/resolutions/page.tsx`).
- 13:00 일괄 공개: 관리자 "전체 공개" 버튼 하나 (스케줄러보다 단순·안전). 위원회별로도 가능하게.
- 토픽당 결의안 여러 개: DB는 이미 허용(`topic_id`에 unique 없음). 하지만 **사이트는 `entries.find()`로 첫 번째만 그린다** — 토픽 행 안에 여러 결의안을 나열하도록 web 수정 필요.
- 패널: 참가자 계정·팀 매핑 화면, 결의안 현황판에 진행 상황 + "공개 전환" 버튼.

### 6-2. 공지 (Announcement)

- 긴급 공지·수정사항용. 사이트에 `/announcements` 페이지는 이미 있고 지금은 `apps/web/src/content/announcements/*.mdx` 파일로 관리 (코드 배포 필요).
- 패널에서 쓰려면: `announcements` 테이블 (`title`, `body`, `date`, `urgent`, `published`) + `lib/crud.ts` 팩토리에 스키마 하나 넘기면 CRUD 끝 → web 페이지를 MDX 대신 API로 전환.

### 6-3. 사이트 쪽 남은 일 (회의에서 나온 것, API 변경 불필요)

| 항목                                | 상태          | 비고                                                                                                                                                     |
| ----------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 메인 페이지 영상                    | 대기          | 미디어팀이 나중에 전달. 지금은`public/main.mp4` 임시                                                                                                   |
| 메인 페이지 주제 배경 설명          | 미착수        | 일부러 비워둠. 디자인 확정 후 준원·민찬이 넣기로                                                                                                        |
| 메인 페이지 일정 + 제출 데드라인    | 대기          | 사무국이 확정되면 전달.`schedule` 테이블·API는 이미 있고 **사이트에 표시만 안 됨** (`ScheduleTimeline` 컴포넌트 미사용). 데드라인은 눈에 띄게 |
| DAEMUN 설명                         | 미착수        | 메인 또는 Guide to MUN 어디든 상관없음                                                                                                                   |
| Secretariat 직책 배정               | 임시          | 사진·이름만 실제. 실제 배정으로 교체 (패널 생기면 거기서)                                                                                               |
| Secretariat 인사말(greeting)        | 데이터만 준비 | `people.greeting` 필드와 렌더링은 있으나 값이 비어 있고, 인사말이 보이게 **디자인 재작업** 예정                                                  |
| Committees 토픽 → chair report PDF | 완료          | `topics.report`에 PDF 경로 넣으면 됨. 9월에 업로드                                                                                                     |
| 결의안 다운로드 버튼                | 의도적 차단   | approved 전엔 링크 없음. 공개 시점 제어는 6-1 참고                                                                                                       |

---

## 7. 작업 규칙

- **커밋 전 `pnpm typecheck`** 통과. 루트에서 전체 패키지 검사.
- **스키마 변경**: `packages/db/src/schema.ts` 수정 → `pnpm db:generate` → 생성된 SQL 확인 → 커밋. API 부팅 시 자동 적용. zod 스키마(`packages/shared`)도 같이 맞출 것 — 타입이 web·api·admin에 다 퍼진다.
- **새 CRUD 리소스**: `crudRoutes({ table, create, update, orderBy? })` (`lib/crud.ts`)에 테이블 + zod 스키마 넘기고 `admin.ts`에 `.route("/xxx", ...)` 한 줄. 손으로 라우트 짜지 말 것.
- **배포 시 반드시**: `docker-compose.yml`에 `admin` 서비스 추가, `deploy/Caddyfile`에 도메인 추가, `ADMIN_URL`을 패널 도메인으로.
- **main 머지 = 배포.** `.github/workflows/deploy.yml`이 서버에 SSH로 들어가 `docker compose up -d --build`까지 돌린다. main은 브랜치 보호가 걸려 있어 PR로만 들어간다. 배포 결과는 GitHub Actions 탭에서 확인.

---

## 8. 함정

- **Next.js 16은 학습 데이터의 Next와 다르다.** `middleware.ts` → `proxy.ts`, `revalidateTag(tag, opts)` 2번째 인자 필수, 캐시 모델 변경. `apps/web/node_modules/next/dist/docs/` 먼저 읽을 것.
- `/api/auth/*`는 **Origin 헤더가 `ADMIN_URL`과 같아야** CSRF 통과. curl로 테스트할 땐 `-H "Origin: http://localhost:3001"`.
- 시드는 `conference` 테이블이 비었을 때만 돈다. DB 초기화 = `data/postgres*` 삭제.
- `packages/shared/src/default-site.ts`는 시드 원본이자 web 폴백. DB 시드 후엔 여기 고쳐도 사이트에 안 나옴 — 패널에서 고칠 것.
- pnpm 10은 postinstall 차단. 네이티브 빌드 패키지는 `pnpm-workspace.yaml`의 `onlyBuiltDependencies`에 등록.
- Windows에서 dev 서버 켜둔 채 `git mv` 하면 파일 잠금으로 실패할 수 있음.

---

## 9. 참고 파일

| 뭘 알고 싶을 때    | 파일                                              |
| ------------------ | ------------------------------------------------- |
| 타입·zod 스키마   | `packages/shared/src/schemas.ts`                |
| DB 테이블          | `packages/db/src/schema.ts`                     |
| 관리자 라우트      | `apps/api/src/routes/admin.ts`, `lib/crud.ts` |
| 인증 미들웨어      | `apps/api/src/middleware/auth.ts`               |
| 업로드             | `apps/api/src/routes/uploads.ts`                |
| 환경변수 전체      | `apps/api/src/env.ts`, `.env.example`         |
| web이 API 읽는 법  | `apps/web/src/lib/site.ts`                      |
| 공개 페이로드 조립 | `apps/api/src/routes/public.ts`                 |

curl로 API 확인하는 예시는 README §7에 있다.
