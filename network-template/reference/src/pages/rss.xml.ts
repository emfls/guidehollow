import { publishedArticles, articleUrl, xmlEscape } from '../lib/content';
import { site } from '../config';
export async function GET() {
  const posts = await publishedArticles();
  const items = posts.map(post => `<item><title>${xmlEscape(post.data.title)}</title><link>${site.url}${articleUrl(post)}</link><guid isPermaLink="true">${site.url}${articleUrl(post)}</guid><description>${xmlEscape(post.data.description)}</description><pubDate>${post.data.publishedDate.toUTCString()}</pubDate><category>${post.data.category}</category></item>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>GuideHollow</title><link>${site.url}/</link><description>${xmlEscape(site.description)}</description><language>en-US</language><atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`,{headers:{'Content-Type':'application/rss+xml;charset=utf-8'}});
}
