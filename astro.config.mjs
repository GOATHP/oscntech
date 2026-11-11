// @ts-check
import { defineConfig } from 'astro/config';

// 지금은 GitHub Pages 기본 주소(https://goathp.github.io/oscntech)에 맞춰져 있어요.
// 도메인을 연결하면 site 를 'https://www.도메인' 으로, base 를 '/' 로 바꿔 주세요.
export default defineConfig({
  site: 'https://goathp.github.io',
  base: '/oscntech',
});
