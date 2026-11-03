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

// Question scaffolding is not a document topic. A reader asking "why can't I
// upload my files?" should find an upload guide even if the guide never says
// "my". Keep technical tokens (API, PDF, OCR, CSV, JSON) as required terms.
const QUESTION_FILLERS = new Set([
  'a','about','an','and','are','can','could','did','do','does','for','from',
  'how','i','in','is','it','me','my','not','of','on','or','our','please',
  'should','the','this','to','was','were','what','when','where','who','why',
  'will','with','would','you','your',
]);

/** Treat punctuation as separators; ignore question scaffolding, not technical content. */
export function searchTerms(value: string): string[] {
  const words = value.normalize('NFKC').toLocaleLowerCase('en-US').match(WORDS) ?? [];
  return [...new Set(words.filter(word =>
    (word.length >= 2 || /^\d+$/.test(word)) && !QUESTION_FILLERS.has(word)))];
}

function tokens(value: string): string[] {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').match(WORDS) ?? [];
}
function matchesWord(word: string, term: string): boolean {
  // Prefix match only for substantial terms: "prompt" finds "prompting",
  // but "AI" must be a complete word, not a substring of "paid".
  if (word === term || (term.length >= 4 && word.startsWith(term))) return true;
  // Handle a few transparent inflections in reader questions: "uploads"
  // finds "upload", "uploaded" finds "upload", "policies" finds "policy".
  // Require exact stem matches to avoid broad, unrelated substring hits.
  if (term.length < 5) return false;
  const stems: string[] = [];
  if (term.endsWith('ies')) stems.push(term.slice(0, -3) + 'y');
  if (term.endsWith('ing')) stems.push(term.slice(0, -3));
  if (term.endsWith('ed')) stems.push(term.slice(0, -2));
  if (term.endsWith('s') && !term.endsWith('ss')) stems.push(term.slice(0, -1));
  return stems.some(stem => stem.length >= 4 && word === stem);
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
      + ((' ' + titleWords.join(' ') + ' ').includes(' ' + phrase + ' ') ? 18 : 0)
      + ((' ' + descriptionWords.join(' ') + ' ').includes(' ' + phrase + ' ') ? 7 : 0);
    return [{entry,score,preview:contextSnippet(plain,terms)}];
  }).sort((a,b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));
}
