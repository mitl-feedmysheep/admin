# Admin (어드민 대시보드)

Next.js 16 / React 19 / TypeScript / Prisma 6

## 개요

교회 관리자용 웹/태블릿 대시보드. MySQL 직접 연결 (Prisma ORM).

## 주요 라이브러리

- UI: shadcn/ui (New York 스타일) + Radix UI
- 폼: react-hook-form + zod
- ORM: Prisma 6
- 스타일: Tailwind CSS 4
- 인증: jose (JWT), bcryptjs
- 테마: next-themes (다크모드)
- 토스트: sonner
- 엑셀: xlsx
- 아이콘: lucide-react

## 디렉토리 구조 (App Router)

```
src/
├── app/
│   ├── api/                # API 라우트 (RESTful)
│   ├── dashboard/          # 대시보드
│   ├── members/            # 회원 관리
│   │   └── [id]/           # 회원 상세
│   ├── groups/             # 소그룹 관리
│   │   └── [id]/           # 소그룹 상세
│   ├── manage/             # 운영 관리
│   ├── system/             # 시스템 설정
│   └── globals.css         # Tailwind + 테마 (oklch)
├── components/
│   ├── ui/                 # shadcn 기본 컴포넌트
│   ├── AdminLayout.tsx     # 레이아웃 (서버)
│   ├── AdminLayoutClient.tsx # 레이아웃 (클라이언트)
│   ├── Sidebar.tsx         # 사이드바 (264px)
│   └── ConfirmDialog.tsx   # 확인 다이얼로그
└── lib/                    # 유틸리티
```

## 코드 패턴

- **Server/Client 분리**: page.tsx (서버) -> *-client.tsx (클라이언트)
- 서버 컴포넌트에서 `getSession()` 호출, 클라이언트로 전달
- 상태관리: React hooks만 사용
- API: `/app/api/` 라우트에서 Prisma 직접 쿼리
- 응답 형식: `{ success: boolean, data: {...}, error: "..." }`

## 반응형 (웹/태블릿)

- `md:` (768px) 기준으로 모바일/데스크톱 분기
- 모바일: Sheet 네비게이션 + 스티키 헤더
- 데스크톱: 고정 사이드바 (264px)
- 그리드: `grid gap-4 md:grid-cols-2 lg:grid-cols-3`

## 인증

- JWT (90일 만료), HttpOnly 쿠키 `admin_token`
- 역할: system admin, church admin, member
- 교회 단위 데이터 격리 + 교회 전환 기능

## DB

- MySQL (Prisma ORM, backend와 같은 DB)
- Soft delete: `deleted_at` 필드
- 교회-회원: `church_member` 다대다

## 작업 시 필수 확인

- 쿼리 추가/변경 시 반드시 기존 인덱스를 확인하고, 필요하면 새 인덱스를 추가할 것
- 환경변수를 추가/삭제/수정하면 반드시 사용자에게 "Doppler에서 해당 환경변수를 변경해주세요"라고 알려줄 것
- 기능 개발 후 테스트코드는 항상 고려해서 작성할 것

## 빌드

- `output: "standalone"` (Docker 최적화)
- 언어: 한국어 (`lang="ko"`)
- 경로 별칭: `@/*` -> `./src/*`
