import { xmlEscape } from './content';

/** Reader-facing RSS metadata. Stable publication dates and URLs are never rewritten. */
export interface FeedEntry {
  title: string;
  description: string;
  url: string;
  category: string;
  publishedDate: Date;
  updatedDate: Date;
}

export function renderRssItems(entries: FeedEntry[], siteUrl: string): string {
  // Show material corrections to earlier guides without altering original
  // publication dates or minting a new GUID for the same article.
  const sorted = [...entries].sort((a, b) =>
    b.updatedDate.getTime() - a.updatedDate.getTime()
    || b.publishedDate.getTime() - a.publishedDate.getTime()
    || a.url.localeCompare(b.url)
  );
  return sorted.map(entry => {
    const permalink = xmlEscape(new URL(entry.url, siteUrl).href);
    const published = entry.publishedDate.toUTCString();
    const modified = entry.updatedDate.toISOString();
    return `<item><title>${xmlEscape(entry.title)}</title><link>${permalink}</link><guid isPermaLink="true">${permalink}</guid><description>${xmlEscape(entry.description)}</description><pubDate>${published}</pubDate><dcterms:modified>${modified}</dcterms:modified><category>${xmlEscape(entry.category)}</category></item>`;
  }).join('');
}
