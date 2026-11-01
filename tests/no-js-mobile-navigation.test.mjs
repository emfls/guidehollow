import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('small-screen navigation shows full categories by default when scripts are unavailable', () => {
  const css = read('src/styles/global.css');
  const mobile = css.slice(css.indexOf('@media(max-width:800px)'));
  assert.match(mobile, /#main-nav\{display:flex;width:100%;order:3/);
  assert.doesNotMatch(mobile, /(?:^|})#main-nav\{display:none/);
  assert.match(mobile, /\.has-mobile-menu #main-nav\{display:none\}/);
  assert.match(mobile, /\.has-mobile-menu #main-nav\.is-open\{display:flex\}/);
  assert.match(mobile, /\.has-mobile-menu \.menu-toggle\{display:block/);
  assert.doesNotMatch(mobile, /(?:^|})\.menu-toggle\{display:block/);
});

test('mobile menu is only enhanced after its interaction is installed', () => {
  const script = read('src/scripts/site.ts');
  const page = read('src/layouts/Base.astro');
  const attach = script.indexOf("menu.addEventListener('click'");
  const enhance = script.indexOf("document.documentElement.classList.add('has-mobile-menu')");
  assert(attach >= 0 && enhance > attach, 'Set enhancement class only after handler is added');
  assert.match(script, /if \(menu && mainNav\) \{/);
  assert.match(script, /menu\.setAttribute\('aria-expanded', String\(open\)\)/);
  assert.match(script, /mainNav\.classList\.toggle\('is-open', open\)/);
  assert.match(script, /mainNav\.classList\.remove\('is-open'\)/);
  assert.match(page, /<nav aria-label="Main navigation" id="main-nav">\{categories\.map/);
  assert.match(page, /id="menu-toggle" class="menu-toggle" aria-expanded="false" aria-controls="main-nav"/);
  assert(!page.includes('class="has-mobile-menu"'), 'Server response must not hide navigation before the script runs');
});

test('category anchors are not gated by a login or client-only script', () => {
  const page = read('src/layouts/Base.astro');
  assert(page.includes('href={\`/\${c.slug}/\`}' ));
  assert(!page.includes('<noscript><nav'));
  const cfg = read('src/config.ts');
  for (const category of ['guides', 'ai-tools', 'prompts', 'troubleshooting', 'tools']) {
    assert(cfg.includes("slug: '"+category+"'"), 'Missing category '+category);
  }
});
