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

/** Convert locally available Markdown guide text to readable searchable passages. */
export function readableSearchText(raw: string): string {
  return raw
    .replace(/!\[([^\]]*)\]\([^\n)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/[^\s)]+/g, ' ')
    .replace(/[\x60*_#>|~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const WORDS = /[\p{L}\p{N}]+/gu;

/** Treat hyphens and slashes as separators; never match "AI" inside "email". */
export function searchTerms(value: string): string[] {
  const words = value.normalize('NFKC').toLocaleLowerCase('en-US').match(WORDS) ?? [];
  // Ignore single-letter fragments such as "s" from contractions.
  return [...new Set(words.filter(word => word.length >= 2 || /^\d+$/.test(word)))];
}

function tokens(value: string): string[] {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').match(WORDS) ?? [];
}
function matchesWord(word: string, term: string): boolean {
  // Prefix match only for substantial terms: "prompt" finds "prompting",
  // but "AI" must be a complete word, not a substring of "paid".
  return word === term || (term.length >= 4 && word.startsWith(term));
}
function matchesTerm(words: string[], term: string): boolean {
  return words.some(word => matchesWord(word, term));
}

/** Find a passage containing a genuine word hit, not an incidental substring. */
function contextSnippet(text: string, terms: string[], maxLength = 190): string {
  if (!text) return '';
  const lower = text.normalize('NFKC').toLocaleLowerCase('en-US');
  const words = [...lower.matchAll(WORDS)];
  const index = [...terms].sort((a,b) => b.length - a.length)
    .map(term => words.find(match => matchesWord(match[0],term))?.index)
    .find(value => value !== undefined);
  if (index === undefined) return '';
  const start = Math.max(0, index - 65);
  const end = Math.min(text.length, start + maxLength);
  const excerpt = text.slice(start,end).trim();
  return (start > 0 ? '…' : '') + excerpt + (end < text.length ? '…' : '');
}

/** Reader-first relevance: exact word/title > summary > actual guide passage. */
export function searchEntries(entries: SearchEntry[], query: string): SearchHit[] {
  const terms = searchTerms(query.slice(0,200));
  if (!terms.length) return [];
  const phrase = terms.join(' ');
  return entries.flatMap(entry => {
    const titleWords = tokens(entry.title);
    const descriptionWords = tokens(entry.description);
    const plain = readableSearchText(entry.text);
    const bodyWords = tokens(plain);
    const matched = terms.map(term => ({
      title: matchesTerm(titleWords, term),
      description: matchesTerm(descriptionWords,term),
      body: matchesTerm(bodyWords,term),
    }));
    if (matched.some(where => !(where.title || where.description || where.body))) return [];
    const score = matched.reduce((sum,where) =>
      sum + (where.title ? 12 : 0) + (where.description ? 5 : 0) + (where.body ? 1 : 0),0)
      + (titleWords.join(' ').includes(phrase) ? 18 : 0)
      + (descriptionWords.join(' ').includes(phrase) ? 7 : 0);
    return [{entry,score,preview:contextSnippet(plain,terms)}];
  }).sort((a,b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));
}
