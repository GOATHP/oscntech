/**
 * OSC&TECH 관리자 저장 서버 (Cloudflare Worker)
 *
 * 관리자 화면(/admin)에서 비밀번호로 로그인하면,
 * 이 서버가 대신 GitHub 저장소의 내용 파일을 읽고 저장해 줘요.
 *
 * Cloudflare Worker 설정 → 변수 및 비밀(Variables and Secrets)에 아래 값을 넣어 주세요.
 *   ADMIN_PASSWORD  (비밀)  관리자 비밀번호
 *   GITHUB_TOKEN    (비밀)  oscntech 저장소에만 Contents 읽기/쓰기 권한이 있는 GitHub 토큰
 *   REPO            (텍스트) GOATHP/oscntech
 *   BRANCH          (텍스트) main
 *   ALLOWED_ORIGIN  (텍스트) https://goathp.github.io   (도메인 연결 후엔 그 주소, 여러 개면 쉼표로 구분)
 */

// 관리자 화면에서 수정할 수 있는 파일만 허용해요
const ALLOWED_PATHS = [
  /^src\/data\/(site|pages|products|references|certifications)\.json$/,
  /^public\/images\/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp|gif|svg)$/i,
];
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] || '',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      Vary: 'Origin',
    };
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!allowed.includes(origin)) return json({ error: '허용되지 않은 주소에서 요청했어요.' }, 403);

    if (!env.ADMIN_PASSWORD || !env.GITHUB_TOKEN || !env.REPO) {
      return json({ error: '서버 설정(ADMIN_PASSWORD, GITHUB_TOKEN, REPO)이 비어 있어요.' }, 500);
    }

    // 비밀번호 확인
    const auth = request.headers.get('Authorization') || '';
    const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!(await safeEqual(given, env.ADMIN_PASSWORD))) {
      await new Promise((r) => setTimeout(r, 800)); // 비밀번호 마구 넣어보기 늦추기
      return json({ error: '비밀번호가 맞지 않아요.' }, 401);
    }

    const url = new URL(request.url);
    const branch = env.BRANCH || 'main';
    const gh = (path, init = {}) =>
      fetch(`https://api.github.com/repos/${env.REPO}/contents/${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'oscntech-admin',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(init.headers || {}),
        },
      });

    try {
      // 로그인 확인용
      if (url.pathname === '/login' && request.method === 'POST') return json({ ok: true });

      // 파일 읽기: GET /file?path=src/data/site.json
      if (url.pathname === '/file' && request.method === 'GET') {
        const path = url.searchParams.get('path') || '';
        if (!isAllowed(path)) return json({ error: '수정할 수 없는 파일이에요.' }, 400);
        const res = await gh(`${path}?ref=${encodeURIComponent(branch)}`);
        if (!res.ok) return json({ error: `GitHub에서 파일을 못 읽었어요 (${res.status}).` }, 502);
        const data = await res.json();
        return json({ sha: data.sha, content: b64ToUtf8(data.content) });
      }

      // 파일 저장: PUT /file  { path, content | base64, sha?, message? }
      if (url.pathname === '/file' && request.method === 'PUT') {
        const body = await request.json();
        const path = String(body.path || '');
        if (!isAllowed(path)) return json({ error: '수정할 수 없는 파일이에요.' }, 400);

        let base64;
        if (typeof body.base64 === 'string') {
          base64 = body.base64;
          if (base64.length * 0.75 > MAX_UPLOAD_BYTES) return json({ error: '사진이 너무 커요 (8MB 이하).' }, 400);
        } else if (typeof body.content === 'string') {
          if (path.endsWith('.json')) {
            try { JSON.parse(body.content); } catch { return json({ error: '내용 형식이 깨져서 저장하지 않았어요.' }, 400); }
          }
          base64 = utf8ToB64(body.content);
        } else {
          return json({ error: '저장할 내용이 없어요.' }, 400);
        }

        const res = await gh(path, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: String(body.message || `관리자 수정: ${path}`).slice(0, 200),
            content: base64,
            branch,
            ...(body.sha ? { sha: body.sha } : {}),
          }),
        });
        if (res.status === 409 || res.status === 422) {
          return json({ error: '그사이 다른 곳에서 수정됐어요. 새로고침 후 다시 저장해 주세요.' }, 409);
        }
        if (!res.ok) return json({ error: `GitHub 저장에 실패했어요 (${res.status}).` }, 502);
        const data = await res.json();
        return json({ ok: true, sha: data.content?.sha });
      }

      return json({ error: '없는 주소예요.' }, 404);
    } catch (e) {
      return json({ error: '서버 오류가 났어요.' }, 500);
    }
  },
};

function isAllowed(path) {
  return !path.includes('..') && ALLOWED_PATHS.some((re) => re.test(path));
}

async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0 && a.length > 0;
}

function b64ToUtf8(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
