import { searchEntries, type SearchEntry } from '../lib/search';

const input = document.querySelector<HTMLInputElement>('#search-query')!;
const form = document.querySelector<HTMLFormElement>('#search-form')!;
const results = document.querySelector<HTMLElement>('#search-results')!;
const status = document.querySelector<HTMLElement>('#search-status')!;
let entries: SearchEntry[] | undefined;
let requestNumber = 0;

async function search() {
  const current = ++requestNumber;
  const query = input.value.trim().slice(0, 200);
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  history.replaceState(null, '', '/search/' + (query ? '?' + params.toString() : ''));
  results.replaceChildren();
  if (!query) {
    status.textContent = 'Enter a word or phrase to get started.';
    return;
  }
  status.textContent = 'Searching…';
  try {
    if (!entries) {
      const response = await fetch('/search-index.json');
      if (!response.ok) throw new Error('Search index unavailable');
      entries = await response.json() as SearchEntry[];
    }
    if (current !== requestNumber) return;
    const hits = searchEntries(entries, query);
    status.textContent = hits.length
      ? hits.length + ' ' + (hits.length === 1 ? 'result' : 'results') + ' for “' + query + '”, ranked by title, summary, and guide text.'
      : 'No results for “' + query + '”. Try fewer words, or browse a category above.';
    for (const hit of hits) {
      const article = document.createElement('article');
      article.className = 'search-result';
      const heading = document.createElement('h2');
      const link = document.createElement('a');
      link.href = hit.entry.url;
      link.textContent = hit.entry.title;
      heading.append(link);
      const description = document.createElement('p');
      description.textContent = hit.entry.description;
      article.append(heading, description);
      // Tool index entries contain search keywords, not editorial paragraphs.
      // Only show passages extracted from published guides, as plain text.
      if (hit.preview && !hit.entry.url.startsWith('/tools/')) {
        const preview = document.createElement('p');
        preview.className = 'search-preview';
        preview.textContent = 'Relevant guide passage: ' + hit.preview;
        article.append(preview);
      }
      results.append(article);
    }
  } catch {
    if (current === requestNumber) {
      status.textContent = 'Search could not load. Please try again, or browse the categories above.';
    }
  }
}

let timer: ReturnType<typeof setTimeout>;
input.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(search, 180);
});
form.addEventListener('submit', event => {
  event.preventDefault();
  clearTimeout(timer);
  void search();
});
input.value = new URLSearchParams(location.search).get('q')?.slice(0, 200) ?? '';
if (input.value) void search();
