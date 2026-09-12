import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<h1>Wake test</h1>');
  await page.evaluate(() => {
    const attach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(options) { return attach.call(this, { ...options, mode: 'open' }); };
    window.messages = [];
    window.chrome = { storage: { local: { get: async () => ({}), set: async () => {} } }, runtime: {
      sendMessage: async message => { window.messages.push(message); return { paired: true, selected: true, state: { budget: { spent: 0 }, run: null } }; }, onMessage: { addListener() {} }
    } };
    window.SpeechRecognition = window.webkitSpeechRecognition = class {
      constructor() { window.lastRecognition = this; }
      start() {}
      abort() { this.onend?.(); }
    };
  });
  await page.addScriptTag({ path: 'extension/overlay.js' });
  await page.locator('#wake').click();
  await page.waitForFunction(() => Boolean(window.lastRecognition));
  const say = text => page.evaluate(text => {
    const result = [{ transcript: text }]; result.isFinal = true;
    window.lastRecognition.onresult({ resultIndex: 0, results: [result] });
  }, text);
  await say('ordinary background conversation');
  assert.equal(await page.evaluate(() => messages.filter(m => m.type === 'ORBIT_START').length), 0);
  await say('Hello Orbit find notebooks');
  await page.waitForFunction(() => messages.some(m => m.type === 'ORBIT_START'));
  assert.equal(await page.evaluate(() => messages.find(m => m.type === 'ORBIT_START').task), 'find notebooks');
  assert.ok(await page.locator('#voice option').count() <= 5);
  console.log('Wake phrase dispatches task; unrelated speech ignored; voice list bounded.');
} finally { await browser.close(); }
