// UI-only test of the overlay with a stub Chrome messaging API. Does not install an extension.
import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setContent(`<style>body{font-family:Arial;background:#f8f8f7;padding:35px;color:#333}h1{color:#d6242a;font-style:italic;font-size:42px}.bar{height:2px;background:#ddd;margin:25px 0}.items{display:flex;gap:24px}article{width:230px;background:#fff;border:1px solid #eee;padding:25px;border-radius:12px}.eggs{font-size:60px;margin:30px 0}p{color:#888}</style><h1>grocery</h1><p>Local UI fixture · Your existing browser tab</p><div class="bar"></div><h2>Everyday essentials</h2><section class="items"><article><div class="eggs">🥚</div><h3>Large eggs</h3><p>12 pack</p><b>$3.99</b></article><article><div class="eggs">🥛</div><h3>Milk</h3><p>2 litres</p><b>$4.99</b></article></section>`);
  await page.evaluate(() => {
    window.chrome = { storage: { local: { get: async () => ({}), set: async () => {} } }, runtime: { sendMessage: async () => ({ paired: true, selected: true, state: { budget: { spent: .003 }, run: null } }), onMessage: { addListener() {} } } };
  });
  await page.addScriptTag({ path: 'extension/overlay.js' });
  assert.equal(await page.locator('#orbit-widget').count(), 1);
  const bounds = await page.locator('#orbit-widget').boundingBox(); assert.ok(bounds.x > 1000 && bounds.y < 25);
  await page.addScriptTag({ path: 'extension/overlay.js' }); assert.equal(await page.locator('#orbit-widget').count(), 1);
  fs.mkdirSync('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/orbit-overlay.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Floating overlay renders top-right without duplicate injection or page errors.');
} finally { await browser.close(); }
