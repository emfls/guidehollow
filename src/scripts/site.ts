const menu = document.querySelector<HTMLButtonElement>('#menu-toggle');
menu?.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); document.querySelector('#main-nav')?.classList.toggle('is-open', open); });
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); const input = document.querySelector<HTMLInputElement>('input[type="search"]'); if (input) input.focus(); else window.location.assign('/search/'); }
  if (event.key === 'Escape' && menu) { menu.setAttribute('aria-expanded', 'false'); document.querySelector('#main-nav')?.classList.remove('is-open'); }
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
  const button = document.createElement('button'); button.type = 'button'; button.className = 'copy-button'; button.textContent = 'Copy'; button.setAttribute('aria-label', 'Copy code or prompt'); button.setAttribute('aria-live', 'polite');
  button.addEventListener('click', () => copyText(pre.querySelector('code')?.textContent ?? '', button)); pre.append(button);
});
