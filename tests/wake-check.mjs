import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const candidates = [process.env.TEST_CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const executablePath = candidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('Set TEST_CHROME_PATH to a Google Chrome executable.');
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<h1>Wake test</h1>');
  await page.evaluate(() => {
    const attach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(options) { return attach.call(this, { ...options, mode: 'open' }); };
    window.messages = []; window.recognizers = []; window.spoken = []; window.store = {};
    window.chrome = { storage: { local: {
      get: async keys => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(key => key in window.store).map(key => [key, window.store[key]])),
      set: async values => Object.assign(window.store, values)
    } }, runtime: {
      sendMessage: async message => { window.messages.push(message); return { paired: true, selected: true, state: { budget: { spent: 0 }, run: null } }; },
      onMessage: { addListener(listener) { window.orbitMessage = listener; } }
    } };
    window.SpeechRecognition = window.webkitSpeechRecognition = class {
      constructor() { window.lastRecognition = this; window.recognizers.push(this); }
      start() {}
      abort() { this.onend?.(); }
    };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { constructor(text) { this.text = text; } } });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [], addEventListener() {}, cancel() {}, resume() {},
      speak(utterance) { window.spoken.push(utterance.text); setTimeout(() => { utterance.onstart?.(); utterance.onend?.(); }, 0); }
    } });
  });
  await page.addScriptTag({ path: 'extension/overlay.js' });
  const cardHidden = () => page.evaluate(() => document.querySelector('#orbit-widget').shadowRoot.getElementById('card').hidden);
  assert.equal(await cardHidden(), true);
  await page.evaluate(() => document.querySelector('#orbit-widget').shadowRoot.getElementById('wake').click());
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
  assert.equal(await cardHidden(), true);
  await page.waitForFunction(() => window.recognizers.length >= 2);
  await say('Hello');
  await say('Orbit');
  await page.waitForFunction(() => window.recognizers.length >= 3);
  assert.equal(await page.evaluate(() => document.querySelector('#orbit-widget').shadowRoot.getElementById('orb').classList.contains('listening')), true);
  await say('hello');
  await page.waitForFunction(() => window.recognizers.length >= 4);
  assert.equal(await page.evaluate(() => messages.filter(m => m.type === 'ORBIT_START').length), 1);
  assert.equal(await page.evaluate(() => document.querySelector('#orbit-widget').shadowRoot.getElementById('orb').classList.contains('listening')), true);
  await page.evaluate(() => { lastRecognition.onerror({ error: 'no-speech' }); lastRecognition.onend(); });
  await page.waitForFunction(() => window.recognizers.length >= 5);
  await say('find pencils');
  await page.waitForFunction(() => messages.filter(m => m.type === 'ORBIT_START').length === 2);
  assert.deepEqual(await page.evaluate(() => messages.filter(m => m.type === 'ORBIT_START').map(m => m.task)), ['find notebooks', 'find pencils']);
  assert.equal(await cardHidden(), true);
  await page.evaluate(() => orbitMessage({ type: 'ORBIT_STATE', state: { budget: { spent: 0 }, run: { id: 'url-test', mode: 'local', status: 'done', message: 'I opened https://example.com/a/very/long/path?with=query for you.', steps: 1, maxSteps: 60 } } }));
  await page.waitForFunction(() => window.spoken.some(text => text.includes('the website')));
  assert.equal(await page.evaluate(() => spoken.some(text => /https?:\/\//i.test(text))), false);
  assert.ok(await page.evaluate(() => document.querySelector('#orbit-widget').shadowRoot.querySelectorAll('#voice option').length) <= 5);
  const before = await page.evaluate(() => spoken.length);
  await page.evaluate(() => orbitMessage({ type: 'ORBIT_STATE', state: { budget: { spent: 0 }, run: { id: 'url-test', mode: 'local', status: 'done', message: 'I opened https://example.com/a/very/long/path?with=query for you.' } } }));
  assert.equal(await page.evaluate(() => spoken.length), before);
  await page.evaluate(() => {
    document.querySelector('#orbit-widget').shadowRoot.getElementById('wake').click();
    orbitMessage({ type: 'ORBIT_STATE', state: { budget: { spent: 0 }, run: { id: 'question', mode: 'local', status: 'waiting', message: 'Which color?' } } });
  });
  await page.waitForFunction(() => lastRecognition.lang === 'en-CA');
  await say('blue');
  await page.evaluate(() => lastRecognition.onend());
  await page.waitForFunction(() => messages.some(m => m.type === 'ORBIT_RESUME' && m.answer === 'blue'));

  console.log('Wake phrase restarts, stays collapsed, ignores background speech, and does not speak full URLs.');
} finally { await browser.close(); }
