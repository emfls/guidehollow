const menu = document.querySelector<HTMLButtonElement>('#menu-toggle');
const mainNav = document.querySelector<HTMLElement>('#main-nav');
// Progressive enhancement: do not collapse navigation until its toggle is wired up.
// If scripts fail or are disabled, all category links remain visible on mobile.
if (menu && mainNav) {
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    mainNav.classList.toggle('is-open', open);
  });
  document.documentElement.classList.add('has-mobile-menu');
}
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); const input = document.querySelector<HTMLInputElement>('input[type="search"]'); if (input) input.focus(); else window.location.assign('/search/'); }
  if (event.key === 'Escape' && menu && mainNav) { menu.setAttribute('aria-expanded', 'false'); mainNav.classList.remove('is-open'); }
});
document.querySelector('#theme-toggle')?.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark'; document.documentElement.dataset.theme = next;
  try { localStorage.setItem('gh-theme', next); } catch {}
  document.querySelector('#theme-toggle')?.setAttribute('aria-label', `Switch to ${dark ? 'dark' : 'light'} theme`);
});
document.querySelector('[data-top]')?.addEventListener('click', event => { event.preventDefault(); window.scrollTo({top: 0}); document.querySelector<HTMLAnchorElement>('.brand')?.focus(); });

export async function copyText(text: string, button: HTMLButtonElement) {
  try { await navigator.clipboard.writeText(text); button.textContent = 'Copied'; }
  catch { button.textContent = 'Copy unavailable — select text'; }
  setTimeout(() => { button.textContent = 'Copy'; }, 3000);
}
document.querySelectorAll('pre').forEach(pre => {
  // Plain-text evidence panels are not code snippets. Copying those using
  // querySelector('code') returned an empty string and misled readers.
  const code = pre.querySelector('code');
  if (!code) return;
  const button = document.createElement('button'); button.type = 'button'; button.className = 'copy-button'; button.textContent = 'Copy'; button.setAttribute('aria-label', 'Copy code or prompt'); button.setAttribute('aria-live', 'polite');
  button.addEventListener('click', () => copyText(code.textContent ?? '', button)); pre.append(button);
});

// Keep the article visible sooner on phones; desktop readers retain the full contents list.
const articleToc = document.querySelector<HTMLDetailsElement>('.toc details');
if (articleToc) {
  const wideScreen = window.matchMedia('(min-width: 801px)');
  const updateTocForWidth = () => { articleToc.open = wideScreen.matches; };
  updateTocForWidth();
  wideScreen.addEventListener('change', updateTocForWidth);
}
