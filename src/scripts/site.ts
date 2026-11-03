import { effectiveTheme, oppositeTheme, themeActionLabel } from '../lib/theme-controls';
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
  // Never steal a keyboard command from an editor. Navigating to /search/
  // while writing a private worksheet or a prompt discards unsaved content.
  const target = event.target as Element | null;
  const typing = target && typeof target.closest === 'function' &&
    target.closest('input,textarea,select,[contenteditable="true"],[contenteditable=""],[role="textbox"]');
  if (!event.defaultPrevented && !event.isComposing && !event.altKey && !event.shiftKey &&
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !typing) {
    event.preventDefault();
    const input = document.querySelector<HTMLInputElement>('input[type="search"]');
    if (input) input.focus(); else window.location.assign('/search/');
  }
  if (event.key === 'Escape' && menu && mainNav) { menu.setAttribute('aria-expanded', 'false'); mainNav.classList.remove('is-open'); }
});
const themeToggle = document.querySelector<HTMLButtonElement>('#theme-toggle');
if (themeToggle) {
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const currentTheme = () => effectiveTheme(document.documentElement.dataset.theme, systemTheme.matches);
  const updateThemeLabel = () => {
    const label = themeActionLabel(currentTheme());
    themeToggle.setAttribute('aria-label', label);
    themeToggle.title = label;
  };
  themeToggle.addEventListener('click', () => {
    const next = oppositeTheme(currentTheme());
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('gh-theme', next); } catch {}
    updateThemeLabel();
  });
  // When no explicit override exists, the action changes with the system preference.
  systemTheme.addEventListener('change', updateThemeLabel);
  updateThemeLabel();
  // Hide the otherwise inert button until its click handler is ready.
  document.documentElement.classList.add('has-theme-control');
}
document.querySelector('[data-top]')?.addEventListener('click', event => { event.preventDefault(); window.scrollTo({top: 0}); document.querySelector<HTMLAnchorElement>('.brand')?.focus(); });

const copyTimers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>();
export async function copyText(text: string, button: HTMLButtonElement) {
  const prior = copyTimers.get(button);
  if (prior) clearTimeout(prior);
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard access unavailable');
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied';
    copyTimers.set(button, setTimeout(() => {
      button.textContent = 'Copy';
      copyTimers.delete(button);
    }, 3000));
  } catch {
    // Browser permissions may prevent a write. Select the actual code so
    // keyboard users can press Ctrl+C or Cmd+C without hunting for the text.
    const code = button.parentElement?.querySelector('code');
    const selection = window.getSelection();
    if (code && selection) {
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = 'Selected — press Ctrl/Cmd+C';
    } else {
      button.textContent = 'Copy unavailable — select the code manually';
    }
  }
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
