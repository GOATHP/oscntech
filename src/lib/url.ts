// 사이트가 하위 경로(예: /oscntech)에 올라가도 링크가 깨지지 않게 해 주는 함수
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function u(path?: string) {
  if (!path) return path ?? '';
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  return base + (path.startsWith('/') ? path : '/' + path);
}

// 현재 주소에서 base를 뺀 경로 (메뉴 활성화 표시에 사용)
export function currentPath(pathname: string) {
  const p = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  return p.replace(/\/$/, '') || '/';
}
