import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const axe = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
const results = [];
for (const width of [1366, 390]) {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(t => localStorage.setItem('career-expo-theme', t), theme);
    const page = await context.newPage();
    const errors = [];
    const authRequests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (/\/trpc\/|\/auth\/v1\/|\/analytics/.test(r.url())) authRequests.push(r.url()); });
    for (const route of ['/', '/privacy', '/terms', '/start']) {
      await page.goto(`http://127.0.0.1:5194${route}`);
      await page.locator('h1').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.addScriptTag({content: axe});
      const findings = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })).violations.map(v => ({id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target)})));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      const stem = `${route === '/' ? 'home' : route.slice(1)}-${width}-${theme}`;
      await page.screenshot({path: `docs/qa/launch-essentials/${stem}.png`, fullPage: route !== '/'});
      if (route === '/' || route === '/start') {
        const start = route === '/' ? page.locator('.home-hero a[href="/start"]') : page.getByRole('button', {name:'Start your first day'});
        const id = await start.getAttribute('aria-describedby');
        if (!id || !(await page.locator(`[id="${id}"]`).textContent()).includes("confirm you're 13 or older")) throw Error('Start notice missing');
        const notice = page.locator(`[id="${id}"]`);
        await notice.getByRole('link', {name:'Terms', exact:true}).focus();
        if (!await notice.getByRole('link', {name:'Terms', exact:true}).evaluate(e => e.matches(':focus-visible'))) throw Error('Keyboard focus missing');
      }
      results.push({route, width, theme, overflow, findings, errors: [...errors], authRequests: [...authRequests]});
    }
    await context.close();
  }
}
await browser.close();
await writeFile('docs/qa/launch-essentials/browser-review.json', JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(r => ({...r, findings:r.findings.length})), null, 2));
