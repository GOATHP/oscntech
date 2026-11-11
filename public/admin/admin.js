// OSC&TECH 관리자 화면
// 내용 파일(src/data/*.json)을 입력창으로 보여주고, 저장하면 저장 서버(Cloudflare Worker)를 통해 GitHub에 반영해요.
(function () {
  const API = (document.body.dataset.api || '').replace(/\/$/, '');
  const BASE = document.body.dataset.base || '';

  // ───── 화면 구성 (어떤 파일의 어떤 칸을 보여줄지) ─────
  const S = (name, label, hint) => ({ type: 'string', name, label, hint });
  const T = (name, label, hint) => ({ type: 'text', name, label, hint });
  const I = (name, label) => ({ type: 'image', name, label });

  const FILES = [
    {
      id: 'site', label: '회사 정보', path: 'src/data/site.json',
      fields: [
        S('name', '회사명 (영문)', '로고 자리와 페이지 제목에 쓰여요'),
        S('nameKo', '회사명 (한글)'),
        S('tagline', '한 줄 소개', '메인 화면과 검색 결과 설명에 쓰여요'),
        S('head', '본사 주소'),
        S('factory', '공장 주소'),
        S('tel', '전화번호'),
        S('email', '이메일'),
        S('hours', '상담시간'),
      ],
    },
    {
      id: 'home', label: '메인 화면', path: 'src/data/pages.json', key: 'home',
      fields: [
        T('heroTitle', '메인 큰 문구', '엔터로 줄을 바꿀 수 있어요 (두 줄 권장)'),
        I('heroImage', '메인 배경 사진'),
        T('intro', '회사소개 요약 문단'),
        S('primaryButton', '첫 번째 버튼 글자'),
        S('secondaryButton', '두 번째 버튼 글자'),
        S('ctaTitle', '아래쪽 상담 안내 문구'),
        S('ctaButton', '아래쪽 버튼 글자'),
      ],
    },
    {
      id: 'greeting', label: '인사말', path: 'src/data/pages.json', key: 'greeting',
      fields: [
        S('lead', '강조 문구'),
        T('body', '본문', '빈 줄로 문단을 나눠요'),
        S('ceo', '대표 이름'),
        I('image', '사진'),
      ],
    },
    {
      id: 'business', label: '사업분야', path: 'src/data/pages.json', key: 'business',
      fields: [
        { type: 'list', name: 'areas', label: '사업분야 목록', itemLabel: '사업분야', title: 'title',
          fields: [S('title', '제목'), T('desc', '설명'), I('image', '사진')] },
        { type: 'strings', name: 'steps', label: '진행 절차', itemLabel: '단계' },
      ],
    },
    {
      id: 'products', label: '공급제품', path: 'src/data/products.json', key: 'products', root: 'list',
      list: { itemLabel: '제품 분류', title: 'title',
        fields: [
          S('title', '분류 이름'),
          S('slug', '주소 (영문 소문자)', '예: powder → /products/powder. 영문 소문자, 숫자, - 만 써 주세요'),
          T('summary', '설명'),
          I('image', '대표 사진'),
          { type: 'strings', name: 'items', label: '세부 제품', itemLabel: '제품' },
        ] },
    },
    {
      id: 'references', label: '공급실적', path: 'src/data/references.json', key: 'references', root: 'list',
      list: { itemLabel: '실적', title: 'client',
        fields: [S('year', '연도'), S('client', '고객사'), S('project', '납품 설비'), S('note', '비고')] },
    },
    {
      id: 'certifications', label: '인증현황', path: 'src/data/certifications.json', key: 'certifications', root: 'list',
      list: { itemLabel: '인증서', title: 'title',
        fields: [S('title', '인증서 이름'), S('issuer', '발급 기관'), S('date', '날짜'), I('image', '인증서 사진')] },
    },
  ];

  // ───── 상태 ─────
  let password = sessionStorage.getItem('oscntech-admin') || '';
  const cache = {}; // path → { sha, data }
  let current = null;
  let dirty = false;

  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs = {}, ...children) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null) n.append(c);
    return n;
  };
  const setStatus = (text, kind = '') => { $('status').textContent = text; $('status').className = 'msg ' + kind; };
  const markDirty = () => { dirty = true; setStatus('저장하지 않은 변경이 있어요'); };

  async function api(path, opts = {}) {
    const res = await fetch(API + path, {
      ...opts,
      headers: { Authorization: 'Bearer ' + password, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const err = new Error(data.error || '요청에 실패했어요 (' + res.status + ')');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // ───── 로그인 ─────
  function showLogin(msg) {
    $('app').hidden = true; $('logout').hidden = true; $('login').hidden = false;
    $('login-msg').textContent = msg || ''; $('login-msg').className = 'msg ' + (msg ? 'error' : '');
    $('password').focus();
  }

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    password = $('password').value;
    $('login-msg').textContent = '확인 중...'; $('login-msg').className = 'msg';
    try {
      await api('/login', { method: 'POST', body: '{}' });
      sessionStorage.setItem('oscntech-admin', password);
      start();
    } catch (err) {
      showLogin(err.status === 401 ? '비밀번호가 맞지 않아요.' : err.message || '저장 서버에 연결하지 못했어요.');
    }
  });

  $('logout').addEventListener('click', () => {
    sessionStorage.removeItem('oscntech-admin'); password = ''; showLogin();
  });

  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  // ───── 메인 ─────
  function start() {
    $('login').hidden = true; $('app').hidden = false; $('logout').hidden = false;
    const tabs = $('tabs'); tabs.innerHTML = '';
    for (const f of FILES) tabs.append(el('button', { 'data-id': f.id, onclick: () => open(f) }, f.label));
    open(FILES[0]);
  }

  async function open(file) {
    if (dirty && current && current.path !== file.path) {
      if (!confirm('저장하지 않은 변경이 있어요. 그래도 이동할까요?')) return;
      delete cache[current.path]; dirty = false; setStatus('');
    }
    current = file;
    for (const b of $('tabs').children) b.classList.toggle('active', b.dataset.id === file.id);
    const editor = $('editor');
    editor.innerHTML = '<p class="msg">불러오는 중...</p>';
    try {
      if (!cache[file.path]) {
        const res = await api('/file?path=' + encodeURIComponent(file.path));
        cache[file.path] = { sha: res.sha, data: JSON.parse(res.content) };
      }
      render(file);
    } catch (err) {
      if (err.status === 401) return showLogin('다시 로그인해 주세요.');
      editor.innerHTML = ''; editor.append(el('p', { class: 'msg error' }, err.message));
    }
  }

  function target(file) {
    const data = cache[file.path].data;
    if (!file.key) return { obj: data };
    if (file.root === 'list') { if (!Array.isArray(data[file.key])) data[file.key] = []; return { list: data[file.key] }; }
    if (!data[file.key]) data[file.key] = {};
    return { obj: data[file.key] };
  }

  function render(file) {
    const editor = $('editor'); editor.innerHTML = '';
    editor.append(el('h2', { style: 'margin-top:0' }, file.label));
    const t = target(file);
    if (t.list) editor.append(listWidget(t.list, file.list, null));
    else for (const f of file.fields) editor.append(field(t.obj, f));
  }

  function field(obj, f) {
    if (f.type === 'list') {
      if (!Array.isArray(obj[f.name])) obj[f.name] = [];
      return el('div', { class: 'group' }, el('h3', {}, f.label), listWidget(obj[f.name], f));
    }
    if (f.type === 'strings') {
      if (!Array.isArray(obj[f.name])) obj[f.name] = [];
      return el('div', { class: 'field' }, el('label', {}, f.label), stringsWidget(obj[f.name], f));
    }
    const wrap = el('div', { class: 'field' }, el('label', {}, f.label));
    if (f.type === 'image') wrap.append(imageWidget(obj, f.name));
    else {
      const input = f.type === 'text' ? el('textarea') : el('input', { type: 'text' });
      input.value = obj[f.name] ?? '';
      input.addEventListener('input', () => { obj[f.name] = input.value; markDirty(); });
      wrap.append(input);
    }
    if (f.hint) wrap.append(el('div', { class: 'hint' }, f.hint));
    return wrap;
  }

  function listWidget(arr, spec) {
    const box = el('div');
    const draw = () => {
      box.innerHTML = '';
      arr.forEach((item, i) => {
        const title = (spec.title && item[spec.title]) || spec.itemLabel + ' ' + (i + 1);
        const head = el('div', { class: 'item-head' }, el('span', {}, title),
          el('div', { class: 'item-actions' },
            el('button', { class: 'ghost small', type: 'button', disabled: i === 0, onclick: () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; markDirty(); draw(); } }, '▲'),
            el('button', { class: 'ghost small', type: 'button', disabled: i === arr.length - 1, onclick: () => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; markDirty(); draw(); } }, '▼'),
            el('button', { class: 'danger small', type: 'button', onclick: () => { if (confirm(title + ' 항목을 삭제할까요?')) { arr.splice(i, 1); markDirty(); draw(); } } }, '삭제')));
        const body = el('div');
        for (const f of spec.fields) body.append(field(item, f));
        box.append(el('div', { class: 'item' }, head, body));
      });
      box.append(el('button', { class: 'ghost', type: 'button', onclick: () => {
        const blank = {};
        for (const f of spec.fields) blank[f.name] = f.type === 'strings' || f.type === 'list' ? [] : '';
        arr.push(blank); markDirty(); draw();
      } }, '+ ' + spec.itemLabel + ' 추가'));
    };
    draw();
    return box;
  }

  function stringsWidget(arr, spec) {
    const box = el('div');
    const draw = () => {
      box.innerHTML = '';
      arr.forEach((v, i) => {
        const input = el('input', { type: 'text' }); input.value = v;
        input.addEventListener('input', () => { arr[i] = input.value; markDirty(); });
        box.append(el('div', { class: 'row' }, input,
          el('button', { class: 'danger small', type: 'button', onclick: () => { arr.splice(i, 1); markDirty(); draw(); } }, '삭제')));
      });
      box.append(el('button', { class: 'ghost small', type: 'button', onclick: () => { arr.push(''); markDirty(); draw(); } }, '+ ' + spec.itemLabel + ' 추가'));
    };
    draw();
    return box;
  }

  function imageWidget(obj, name) {
    const preview = el('div', { class: 'preview' });
    const showPreview = (src) => {
      preview.textContent = src ? '' : '사진 없음';
      preview.style.backgroundImage = src ? 'url("' + src + '")' : '';
    };
    showPreview(obj[name] ? BASE + obj[name] : '');
    const fileInput = el('input', { type: 'file', accept: 'image/*', hidden: true });
    const msg = el('span', { class: 'msg' });
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0]; if (!file) return;
      if (file.size > 8 * 1024 * 1024) { msg.textContent = '8MB 이하 사진만 올릴 수 있어요.'; msg.className = 'msg error'; return; }
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const fname = Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.' + ext;
      msg.textContent = '사진 올리는 중...'; msg.className = 'msg';
      try {
        const dataUrl = await new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = fail; r.readAsDataURL(file); });
        await api('/file', { method: 'PUT', body: JSON.stringify({ path: 'public/images/' + fname, base64: String(dataUrl).split(',')[1], message: '관리자 사진 업로드: ' + fname }) });
        obj[name] = '/images/' + fname;
        showPreview(dataUrl);
        msg.textContent = '올렸어요. 저장하기를 눌러야 사이트에 적용돼요.'; msg.className = 'msg ok';
        markDirty();
      } catch (err) {
        msg.textContent = err.message; msg.className = 'msg error';
      }
      fileInput.value = '';
    });
    return el('div', { class: 'img' }, preview,
      el('button', { class: 'ghost small', type: 'button', onclick: () => fileInput.click() }, '사진 선택'),
      el('button', { class: 'danger small', type: 'button', onclick: () => { obj[name] = ''; showPreview(''); markDirty(); } }, '빼기'),
      fileInput, msg);
  }

  $('save').addEventListener('click', async () => {
    if (!current) return;
    const entry = cache[current.path];
    $('save').disabled = true; setStatus('저장 중...');
    try {
      const res = await api('/file', { method: 'PUT', body: JSON.stringify({
        path: current.path, sha: entry.sha, content: JSON.stringify(entry.data, null, 2) + '\n', message: '관리자 수정: ' + current.label,
      }) });
      entry.sha = res.sha; dirty = false;
      setStatus('저장했어요. 1~2분 뒤 사이트에 반영돼요.', 'ok');
    } catch (err) {
      if (err.status === 401) return showLogin('다시 로그인해 주세요.');
      setStatus(err.message, 'error');
    } finally {
      $('save').disabled = false;
    }
  });

  // ───── 시작 ─────
  if (!API) { $('setup').hidden = false; return; }
  if (password) {
    api('/login', { method: 'POST', body: '{}' }).then(start).catch(() => showLogin());
  } else showLogin();
})();
