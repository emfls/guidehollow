export interface SearchEntry {
  title: string;
  description: string;
  url: string;
  text: string;
}

export interface SearchHit {
  entry: SearchEntry;
  preview: string;
  score: number;
}

/** Convert existing, locally downloaded Markdown guide text into readable snippets. */
export function readableSearchText(raw: string): string {
  return raw
    .replace(/!\[([^\]]*)\]\([^\n)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/[^\s)]+/g, ' ')
    .replace(/[`*_#>|~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function contextSnippet(text: string, terms: string[], maxLength = 190): string {
  if (!text) return '';
  const lower = text.toLocaleLowerCase();
  // Longer terms are more specific than ubiquitous short terms like "AI".
  const match = [...terms].sort((a,b) => b.length - a.length)
    .map(term => lower.indexOf(term))
    .find(index => index >= 0);
  if (match === undefined) return '';
  const start = Math.max(0, match - 65);
  const end = Math.min(text.length, start + maxLength);
  const excerpt = text.slice(start, end).trim();
  return (start > 0 ? '…' : '') + excerpt + (end < text.length ? '…' : '');
}

/** Local relevance ranking: title > summary > supporting guide passage. */
export function searchEntries(entries: SearchEntry[], query: string): SearchHit[] {
  const phrase = query.normalize('NFKC').trim().toLocaleLowerCase().slice(0,200);
  if (!phrase) return [];
  const terms = [...new Set(phrase.split(/\s+/).filter(Boolean))];
  return entries.flatMap(entry => {
    const title = entry.title.normalize('NFKC').toLocaleLowerCase();
    const description = entry.description.normalize('NFKC').toLocaleLowerCase();
    const plain = readableSearchText(entry.text);
    const body = plain.normalize('NFKC').toLocaleLowerCase();
    if (!terms.every(term => title.includes(term) || description.includes(term) || body.includes(term))) return [];
    const score = terms.reduce((sum, term) =>
      sum + (title.includes(term) ? 12 : 0)
        + (description.includes(term) ? 5 : 0)
        + (body.includes(term) ? 1 : 0), 0)
      + (title.includes(phrase) ? 18 : 0)
      + (description.includes(phrase) ? 7 : 0);
    return [{ entry, score, preview: contextSnippet(plain, terms) }];
  }).sort((a,b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));
}
