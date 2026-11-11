import productsData from './products.json';
const products = productsData.products;

export type NavItem = { label: string; href: string; children?: { label: string; href: string }[] };

export const nav: NavItem[] = [
  {
    label: '회사소개',
    href: '/about',
    children: [
      { label: '인사말', href: '/about' },
      { label: '인증현황', href: '/about/certifications' },
      { label: '오시는 길', href: '/about/location' },
    ],
  },
  { label: '사업분야', href: '/business' },
  { label: '공급실적', href: '/references' },
  {
    label: '공급제품',
    href: '/products',
    children: products.map((p) => ({ label: p.title, href: `/products/${p.slug}` })),
  },
  { label: '문의하기', href: '/contact' },
];
