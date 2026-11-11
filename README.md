# OSC&TECH 홈페이지

## 실행
```
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 폴더에 배포용 파일 생성
```

## 내용 고치는 곳
| 바꿀 내용 | 파일 |
|---|---|
| 회사명, 주소, 전화, 이메일, 상담시간 | `src/data/site.json` |
| 제품 분류 6개 (이름, 설명, 사진, 세부 제품) | `src/data/products.json` |
| 공급실적 표 | `src/data/references.json` |
| 인증서 목록 | `src/data/certifications.json` |
| 상단 메뉴 | `src/data/nav.ts` |
| 메인 화면 문구 | `src/pages/index.astro` |
| 인사말 | `src/pages/about/index.astro` |
| 사업분야 | `src/pages/business.astro` |
| 문의 폼 연결 (Formspree 주소) | `src/pages/contact.astro` 맨 위 `FORM_ENDPOINT` |
| 색상 | `src/styles/global.css` 맨 위 `--brand` |

## 이미지
- `public/images/` 에 넣고 JSON의 `"image"` 칸에 `"/images/파일명.jpg"` 처럼 적으면 돼요.
- 메인 배너 배경: `public/images/hero.jpg`
- 로고: `public/images/logo.png` 넣고 `src/components/Header.astro` 주석 해제

## 관리자 페이지 (/admin)
비밀번호 하나로 들어가서 회사 정보, 메인 문구, 버튼 글자, 인사말, 사업분야, 제품, 실적, 인증서, 사진을 고칠 수 있어요.
저장하면 GitHub에 자동으로 커밋되고 1~2분 뒤 사이트에 반영돼요.

- 관리자 화면: `src/pages/admin/index.astro`, `public/admin/admin.js`
- 저장 서버(Cloudflare Worker): `admin-server/worker.js` — 세팅 방법은 `admin-server/README.md`
- 저장 서버 주소: `src/data/admin.json` 의 `apiUrl`
