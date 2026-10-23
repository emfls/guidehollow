import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, symlink, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('new publication, missing start article, drafts and future content build safely', {timeout:30000}, async () => {
  const fixture = await mkdtemp(path.join(tmpdir(),'guidehollow-publication-'));
  try {
    for (const name of ['src','public','scripts','astro.config.mjs','tsconfig.json','package.json']) await cp(name,path.join(fixture,name),{recursive:true});
    await symlink(path.resolve('node_modules'),path.join(fixture,'node_modules'),'dir');
    const article = path.join(fixture,'src/content/articles/what-is-generative-ai.md');
    const original = await readFile(article,'utf8');
    // Rename a published slug and its explicit editorial links, leaving Start Here to handle its missing selection.
    await writeFile(article,original.replace('slug: "what-is-generative-ai"','slug: "generative-ai-introduction"'));
    const about = path.join(fixture,'src/pages/about.astro');
    await writeFile(about,(await readFile(about,'utf8')).replace('/guides/what-is-generative-ai/','/guides/generative-ai-introduction/'));
    const collection = path.join(fixture,'src/content/articles');
    for (const [slug,extra] of [['additional-public-guide',''],['private-draft-sentinel','draft'],['future-guide-sentinel','future']]) {
      let content = original.replaceAll('what-is-generative-ai',slug).replace(/^title:.*$/m,`title: ${JSON.stringify(slug)}`);
      if(extra==='draft') content=content.replace('draft: false','draft: true');
      if(extra==='future') content=content.replaceAll('2026-10-23','2999-01-01');
      await writeFile(path.join(collection,`${slug}.md`),content);
    }
    const astroPackage = JSON.parse(await readFile('node_modules/astro/package.json','utf8'));
    const build = spawnSync(process.execPath,[path.resolve('node_modules/astro',astroPackage.bin.astro),'build'],{cwd:fixture,encoding:'utf8',timeout:20000});
    assert.equal(build.status,0,`${build.stdout}\n${build.stderr}`);
    const verify = spawnSync(process.execPath,['scripts/verify-build.mjs'],{cwd:fixture,encoding:'utf8'});
    assert.equal(verify.status,0,`${verify.stdout}\n${verify.stderr}`);
    const index = JSON.parse(await readFile(path.join(fixture,'dist/search-index.json'),'utf8'));
    assert.equal(index.length,15,'13 articles and 2 tools');
    const home = await readFile(path.join(fixture,'dist/index.html'),'utf8');
    assert(!home.includes('href="/guides/what-is-generative-ai/"'));
    const promptPage = await readFile(path.join(fixture,'dist/tools/ai-prompt-builder/index.html'),'utf8');
    assert.match(promptPage,/<fieldset[^>]*\bdisabled(?:\s|>)/,'Prompt inputs must be inert until the local script is ready, preventing no-JS GET submission');
    async function checkOutput(dir) {
      for(const entry of await readdir(dir,{withFileTypes:true})) {
        const file = path.join(dir,entry.name);
        if(entry.isDirectory()) await checkOutput(file);
        else if(/\.(?:html|xml|json|txt)$/.test(file)) {
          const text = await readFile(file,'utf8');
          assert(!/private-draft-sentinel|future-guide-sentinel/.test(text),`Unpublished content leaked to ${file}`);
        }
      }
    }
    await checkOutput(path.join(fixture,'dist'));
  } finally { await rm(fixture,{recursive:true,force:true}); }
});
