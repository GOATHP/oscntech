# 관리자 저장 서버 세팅 (Cloudflare Worker, 무료)

관리자 화면에서 "저장하기"를 누르면 이 서버가 GitHub 저장소에 파일을 대신 저장해 줘요.
처음 한 번만 세팅하면 돼요. (15분 정도)

## 1. GitHub 토큰 만들기
1. https://github.com/settings/personal-access-tokens/new 열기 (Fine-grained token)
2. Token name: `oscntech-admin`, Expiration: 원하는 기간 (최대 1년, 만료되면 새로 만들어 교체)
3. Repository access: **Only select repositories** → `oscntech`
4. Permissions → Repository permissions → **Contents: Read and write**
5. Generate token → 나온 값(github_pat_...)을 복사해 두기 (다시 볼 수 없어요)

## 2. Cloudflare Worker 만들기
1. https://dash.cloudflare.com 가입/로그인
2. Workers & Pages → Create → Worker → 이름 `oscntech-admin` → Deploy
3. **Edit code** → 기존 코드를 전부 지우고 `worker.js` 내용을 붙여넣기 → Deploy
4. 나온 주소(예: `https://oscntech-admin.xxxx.workers.dev`)를 복사

## 3. 비밀번호와 토큰 넣기
Worker → Settings → Variables and Secrets → Add
| 이름 | 종류 | 값 |
|---|---|---|
| ADMIN_PASSWORD | Secret | 관리자 비밀번호 (길고 어렵게) |
| GITHUB_TOKEN | Secret | 1번에서 복사한 토큰 |
| REPO | Text | `GOATHP/oscntech` |
| BRANCH | Text | `main` |
| ALLOWED_ORIGIN | Text | `https://goathp.github.io` |

도메인을 연결하면 ALLOWED_ORIGIN을 `https://goathp.github.io,https://www.도메인` 처럼 쉼표로 추가하세요.

## 4. 사이트에 서버 주소 연결
`src/data/admin.json` 의 `apiUrl` 에 2번의 Worker 주소를 넣고 커밋하면 끝이에요.
관리자 화면: https://goathp.github.io/oscntech/admin/
