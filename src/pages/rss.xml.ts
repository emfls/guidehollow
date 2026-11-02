import { publishedArticles, articleUrl, xmlEscape } from '../lib/content';
import { renderRssItems } from '../lib/feed';
import { site } from '../config';

export async function GET() {
  const posts = await publishedArticles();
  const items = renderRssItems(posts.map(post => ({
    title: post.data.title,
    description: post.data.description,
    url: articleUrl(post),
    category: post.data.category,
    publishedDate: post.data.publishedDate,
    updatedDate: post.data.updatedDate,
  })), site.url);

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dcterms="http://purl.org/dc/terms/"><channel><title>GuideHollow</title><link>${site.url}/</link><description>${xmlEscape(site.description)}</description><language>en-US</language><atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`, {
    headers: { 'Content-Type': 'application/rss+xml;charset=utf-8' },
  });
}
