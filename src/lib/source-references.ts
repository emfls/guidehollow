/** The title is not a claim that we extracted or checked a live page's HTML title. */
const publisherNames: Record<string, string> = {
  'support.microsoft.com': 'Microsoft Support',
  'support.google.com': 'Google Help',
  'help.openai.com': 'OpenAI Help Center',
  'developers.openai.com': 'OpenAI API documentation',
  'platform.openai.com': 'OpenAI Platform',
  'ai.google.dev': 'Google AI for Developers',
  'docs.github.com': 'GitHub Docs',
  'developer.mozilla.org': 'MDN Web Docs',
  'helpx.adobe.com': 'Adobe Help',
  'www.nasa.gov': 'NASA',
  'nasa.gov': 'NASA',
  'www.atlassian.com': 'Atlassian',
  'json-schema.org': 'JSON Schema',
  'platform.claude.com': 'Claude Developer Docs',
};
const abbreviations: Record<string, string> = {
  ai: 'AI', api: 'API', csv: 'CSV', pdf: 'PDF', ocr: 'OCR', json: 'JSON',
  sumifs: 'SUMIFS', countifs: 'COUNTIFS', countif: 'COUNTIF',
  date: 'DATE', time: 'TIME', chatgpt: 'ChatGPT', excel: 'Excel',
  github: 'GitHub', url: 'URL', utc: 'UTC', xml: 'XML',
};
/**
 * Replace opaque editorial placeholders, such as "docs.github.com — reference",
 * with transparent publisher/topic labels. This is a URL-derived label, not a
 * verified publication title, a live link check or an endorsement.
 */
export function sourceReferenceLabel(title: string, url: string): string {
  if (!/^.+?\s+[—-]\s+reference\s*$/i.test(title.trim())) return title;
  let parsed: URL;
  try { parsed = new URL(url); } catch { return title; }
  const publisher = publisherNames[parsed.hostname.toLowerCase()] ??
    parsed.hostname.replace(/^www\./, '');
  const segments = parsed.pathname.split('/').filter(Boolean);
  const last = decodeURIComponent(segments.at(-1) ?? '').replace(/\.(?:html?|pdf|md)$/i, '');
  if (!last) return publisher + ' — reference page';
  const normalized = last.replace(/^\d{5,}[-_]/, '')
    .replace(/^\d+(?:-\d+)+-/, '')
    .replace(/[-_]+/g, ' ').trim();
  if (/^\d+$/.test(normalized)) {
    return publisher + ' — help article #' + normalized;
  }
  if (!normalized) return publisher + ' — reference page';
  const topic = normalized.split(/\s+/).map(word => {
    const low = word.toLowerCase();
    return abbreviations[low] ?? (word.charAt(0).toUpperCase() + word.slice(1));
  }).join(' ');
  return publisher + ' — ' + topic;
}
