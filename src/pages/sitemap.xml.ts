import { publishedArticles, articleUrl, xmlEscape } from '../lib/content';
import { categories, site } from '../config';
export async function GET() {
  const posts = await publishedArticles();
  const paths = ['/', ...categories.map(c => `/${c.slug}/`), '/about/', '/contact/', '/privacy-policy/', '/terms/', '/editorial-policy/', '/tools/ai-prompt-builder/', '/tools/ai-response-checklist/', ...[...new Set(posts.flatMap(p => p.data.tags))].map(tag => `/tags/${tag}/`)];
  const pages = paths.map(path => `<url><loc>${site.url}${xmlEscape(path)}</loc></url>`);
  pages.push(...posts.map(post => `<url><loc>${site.url}${articleUrl(post)}</loc><lastmod>${post.data.updatedDate.toISOString().slice(0,10)}</lastmod></url>`));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.join('')}</urlset>`,{headers:{'Content-Type':'application/xml;charset=utf-8'}});
}
