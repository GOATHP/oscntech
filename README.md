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
코드를 몰라도 위 JSON 내용(회사 정보, 메인 문구, 인사말, 사업분야, 제품, 실적, 인증서, 사진)을 화면에서 고칠 수 있어요.

**내 컴퓨터에서 써 보기**
1. 터미널 1: `npm run dev`
2. 터미널 2: `npx decap-server`
3. 브라우저에서 http://localhost:4321/admin/index.html → 로그인 버튼 → 수정 → 저장
   (저장하면 src/data/*.json 파일이 바로 바뀌어요)

**배포 후 친구가 쓰려면**
- `public/admin/config.yml` 의 `repo` 를 실제 GitHub 저장소로 바꾸고,
- GitHub 로그인(OAuth) 연결이 필요해요. 사이트를 Cloudflare Pages에 올린 다음 설정해요.
