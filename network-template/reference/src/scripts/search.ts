export {};
interface SearchEntry {title:string;description:string;url:string;text:string}
const input = document.querySelector<HTMLInputElement>('#search-query')!;
const form = document.querySelector<HTMLFormElement>('#search-form')!;
const results = document.querySelector('#search-results')!;
const status = document.querySelector('#search-status')!;
let entries: SearchEntry[] | undefined;
let requestNumber = 0;
async function search() {
  const current = ++requestNumber;
  const query = input.value.trim().slice(0,200);
  const params = new URLSearchParams(); if (query) params.set('q', query);
  history.replaceState(null, '', `/search/${query ? `?${params}` : ''}`);
  results.replaceChildren();
  if (!query) { status.textContent = 'Enter a word or phrase to get started.'; return; }
  status.textContent = 'Searching…';
  try {
    if (!entries) { const response = await fetch('/search-index.json'); if (!response.ok) throw new Error('Search unavailable'); entries = await response.json() as SearchEntry[]; }
    if (current !== requestNumber) return;
    const terms = query.toLowerCase().split(/\s+/);
    const found = entries.filter(entry => terms.every(term => `${entry.title} ${entry.description} ${entry.text}`.toLowerCase().includes(term)))
      .sort((a,b) => terms.filter(t => b.title.toLowerCase().includes(t)).length - terms.filter(t => a.title.toLowerCase().includes(t)).length);
    status.textContent = found.length ? `${found.length} ${found.length === 1 ? 'result' : 'results'} for “${query}”` : `No results for “${query}”. Try fewer words, or browse a category above.`;
    for (const entry of found) { const article = document.createElement('article'); article.className = 'search-result'; const heading = document.createElement('h2'); const link = document.createElement('a'); link.href = entry.url; link.textContent = entry.title; heading.append(link); const description = document.createElement('p'); description.textContent = entry.description; article.append(heading, description); results.append(article); }
  } catch { if (current === requestNumber) status.textContent = 'Search could not load. Please try again, or browse the categories above.'; }
}
let timer: ReturnType<typeof setTimeout>;
input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 180); });
form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); void search(); });
input.value = new URLSearchParams(location.search).get('q')?.slice(0,200) ?? '';
if (input.value) void search();
