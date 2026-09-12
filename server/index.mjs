import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, randomBytes } from 'node:crypto';
import { Budget, MAX_STEPS, saveJson } from './budget.mjs';
import { SteelBrowser, observe, execute, allowedUrl } from './browser.mjs';
import { plan } from './planner.mjs';
import { SteelComputer } from './computer.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const port = Number(process.env.PORT || 4318);
const origins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
const dataDir = process.env.ORBIT_DATA_DIR || path.join(root, '.orbit');
const budget = new Budget(path.join(dataDir, 'budget.json'));
const pairFile = path.join(dataDir, 'extension-pair.json');
const pairing = fs.existsSync(pairFile) ? JSON.parse(fs.readFileSync(pairFile, 'utf8')) : { token: randomBytes(32).toString('hex') };
if (!fs.existsSync(pairFile)) saveJson(pairFile, pairing);
let computer = null, localStep = null;
let run = null, runPromise = null, browser = null, connecting = false, controller = null;
const logs = [];
const log = (kind, message) => {
  logs.push({ id: randomUUID(), at: Date.now(), kind, message });
  if (logs.length > 100) logs.shift();
};
const configured = () => Boolean(process.env.OPENAI_API_KEY && process.env.STEEL_API_KEY);
function state() {
  return { configured: configured(), keys: { openai: Boolean(process.env.OPENAI_API_KEY), steel: Boolean(process.env.STEEL_API_KEY) },
    budget: budget.publicState(), session: browser?.publicState() || null, computer: computer?.publicState() || null, connecting,
    run: run ? { id: run.id, mode: run.mode || 'cloud', model: run.model, modelMode: run.modelMode, task: run.task, status: run.status, message: run.message, steps: run.steps, maxSteps: MAX_STEPS, spent: run.spent } : null,
    logs };
}
function safeError(error) {
  let text = error?.message || 'Something went wrong.';
  for (const key of [process.env.OPENAI_API_KEY, process.env.STEEL_API_KEY]) if (key) text = text.split(key).join('[redacted]');
  return text.replace(/(?:https?|wss?):\/\/\S+/g, '[browser URL]').slice(0, 600);
}
function json(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); }
async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 60000) throw new Error('Request too large.'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}
async function connect() {
  if (connecting) throw new Error('Browser is already starting.');
  if (!configured()) throw new Error('Add your OpenAI and Steel keys in Settings first.');
  connecting = true;
  try {
    if (!browser) browser = new SteelBrowser({ key: process.env.STEEL_API_KEY, stateFile: path.join(dataDir, 'browser.json'), notify: message => log('info', message) });
    const session = await browser.start();
    log('success', 'Browser connected. Your Metro session is ready.');
    return session;
  } finally { connecting = false; }
}
async function loop() {
  const active = run;
  let failures = 0;
  try {
    while (active.status === 'running' && active.steps < MAX_STEPS) {
      if (!browser?.browser?.isConnected()) throw new Error('Browser disconnected. Reconnect before continuing.');
      if (!allowedUrl(browser.page.url())) { active.status = 'waiting'; active.message = 'Open an ordinary website in the live browser, then resume.'; break; }
      const observation = await observe(browser.page);
      if (active.status !== 'running') break;
      active.steps++;
      const action = await plan({ key: process.env.OPENAI_API_KEY, task: active.task, observation, history: active.history, budget, run: active, signal: controller.signal });
      if (active.status !== 'running') break; // A pause cancels pending decisions before they can click anything.
      active.message = action.message;
      if (action.action === 'done' || action.action === 'ask') {
        active.status = action.action === 'done' ? 'done' : 'waiting';
        log(action.action === 'done' ? 'success' : 'question', action.message); break;
      }
      log('action', action.message);
      try {
        await execute(browser.page, action, observation);
        active.history.push({ action: action.action, message: action.message, result: 'Executed; verify next observation.' });
        failures = 0;
      } catch (error) {
        failures++;
        active.history.push({ action: action.action, result: safeError(error) });
        log('info', 'The page changed or the action was unavailable. Checking again.');
        if (failures >= 2) { active.status = 'waiting'; active.message = 'I need a hand with this page. Take over, then resume.'; log('question', active.message); break; }
      }
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    if (active.status === 'running') { active.status = 'limited'; active.message = 'Reached the 60-action limit. Review progress before starting another task.'; log('info', active.message); }
  } catch (error) {
    if (active.status === 'running') { active.status = 'error'; active.message = safeError(error); log('error', active.message); }
  }
}
function launchLoop() {
  controller = new AbortController();
  runPromise = loop().finally(() => { runPromise = null; });
}
async function stop(status) {
  if (run && ['running', 'waiting', 'paused'].includes(run.status)) {
    run.status = status; run.message = status === 'paused' ? 'You’re in control. Resume when you’re ready.' : 'Task stopped.';
    controller?.abort();
    await runPromise; // Finish an in-flight browser action before acknowledging handover.
    await localStep;
    log('info', run.message);
  }
}

async function localRequest(endpoint, body) {
  if (endpoint === 'state') return state();
  if (endpoint === 'connect') {
    if (!configured()) throw new Error('Save your keys in the Orbit workspace first.');
    if (connecting) throw new Error('Steel is already starting.');
    connecting = true;
    try {
      computer ||= new SteelComputer({ key: process.env.STEEL_API_KEY, stateFile: path.join(dataDir, 'computer.json') });
      await computer.ensure(); log('success', 'Steel Computer is ready to operate your selected Chrome tab.');
      return state();
    } finally { connecting = false; }
  }
  if (endpoint === 'start') {
    if (runPromise || localStep || connecting || run?.status === 'running') throw new Error('Stop or resume the existing task first.');
    if (!computer?.ready) throw new Error('Connect Steel Computer first.');
    const task = typeof body.task === 'string' ? body.task.trim() : '';
    if (!task || task.length > 1500) throw new Error('Enter a short task, up to 1,500 characters.');
    run = { id: randomUUID(), mode: 'local', modelMode: ['dynamic', 'low', 'high'].includes(body.modelMode) ? body.modelMode : 'dynamic', task, status: 'running', message: 'Reading your tab…', spent: 0, steps: 0, history: [], memory: Array.isArray(body.memory) ? body.memory.slice(-8).map(item => ({ page: String(item.page || '').slice(0, 500), task: String(item.task || '').slice(0, 1500), status: String(item.status || '').slice(0, 30), outcome: String(item.outcome || '').slice(0, 1000) })) : [], pendingAction: null };
    controller = new AbortController(); log('user', task); return state();
  }
  if (!run || run.mode !== 'local' || body.runId !== run.id) throw new Error('This task is no longer active.');
  if (endpoint === 'pause' || endpoint === 'stop') { await stop(endpoint === 'pause' ? 'paused' : 'stopped'); return state(); }
  if (endpoint === 'resume') {
    if (localStep || !['paused', 'waiting'].includes(run.status)) throw new Error('Pause the task before resuming.');
    if (run.steps >= MAX_STEPS) throw new Error('Step limit reached. Stop and start a new task.');
    const answer = typeof body.answer === 'string' ? body.answer.trim().slice(0, 1000) : '';
    if (answer) { run.task = `${run.task}\nUser clarification: ${answer}`.slice(-4000); log('user', answer); }
    run.pendingAction = null; run.loadingWait = null; run.waitCount = 0;
    run.history.push({ result: 'User reviewed the page and resumed. Reobserve before taking any action.' });
    run.status = 'running'; run.message = 'Continuing in your tab…'; controller = new AbortController(); return state();
  }
  if (endpoint === 'result') {
    if (body.actionId !== run.pendingAction?.id) throw new Error('Action acknowledgement does not match.');
    if (run.pendingAction.action !== 'wait') run.history.push({ action: run.pendingAction.action, message: run.pendingAction.message, result: body.ok ? 'Executed. Verify from the next observation.' : 'Action failed or navigation interrupted it. Reobserve before retrying.' });
    run.pendingAction = null;
    return state();
  }
  if (endpoint === 'step') {
    if (localStep || run.status !== 'running') throw new Error('The agent is paused or already deciding.');
    if (run.pendingAction) { run.status = 'waiting'; run.message = 'The last action was not confirmed. Inspect your page before resuming.'; return { state: state(), action: null }; }
    if (run.steps >= MAX_STEPS) { run.status = 'limited'; run.message = 'Reached the 60-action limit. Review the page before starting a new task.'; return { state: state(), action: null }; }
    const observation = body.observation;
    if (!observation || typeof observation.url !== 'string' || typeof observation.text !== 'string' || !Array.isArray(observation.elements)) throw new Error('Invalid page observation.');
    if (observation.text.length > 7000 || observation.elements.length > 65) throw new Error('Page observation too large.');
    if (!allowedUrl(observation.url)) {
      run.status = 'waiting'; run.message = 'Open an ordinary HTTP/HTTPS website to start.'; return { state: state(), action: null };
    }
    const fingerprint = JSON.stringify(observation);
    if (run.loadingWait) {
      if (run.loadingWait.fingerprint === fingerprint && Date.now() < run.loadingWait.until) {
        const action = { id: randomUUID(), action: 'wait', target: 0, value: '', message: 'Waiting for the page to change…' };
        run.pendingAction = action;
        return { state: state(), action };
      }
      run.loadingWait = null;
    }
    const active = run;
    localStep = (async () => {
      try {
        const action = await plan({ key: process.env.OPENAI_API_KEY, task: active.task, observation, history: active.history, budget, run: active, signal: controller.signal, fetcher: computer.fetcher(process.env.OPENAI_API_KEY, active.id) });
        if (active.status !== 'running') return { state: state(), action: null };
        if (action.action === 'wait') {
          active.waitCount = (active.waitCount || 0) + 1;
          if (active.waitCount >= 3) {
            active.status = 'waiting'; active.message = 'The page is not becoming usable. Check for a loading error or embedded configurator, then Resume. Your progress is preserved.';
            return { state: state(), action: null };
          }
          active.loadingWait = { fingerprint, until: Date.now() + 30000 };
        } else { active.steps++; active.waitCount = 0; }
        active.message = action.message;
        if (action.action === 'done' || action.action === 'ask') {
          active.status = action.action === 'done' ? 'done' : 'waiting'; log(action.action === 'done' ? 'success' : 'question', action.message);
          return { state: state(), action: null };
        }
        action.id = randomUUID(); active.pendingAction = action; log('action', action.message);
        return { state: state(), action };
      } catch (error) {
        if (active.status === 'running') { active.status = 'error'; active.message = safeError(error); log('error', active.message); }
        return { state: state(), action: null };
      }
    })();
    try { return await localStep; } finally { localStep = null; }
  }
  throw new Error('Unknown current-tab action.');
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src https://*.steel.dev; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  if (!hosts.has(req.headers.host)) return json(res, 403, { error: 'Local access only.' });
  if (req.url?.startsWith('/api/local/')) {
    const origin = req.headers.origin;
    if (origin && !/^chrome-extension:\/\/[a-p]{32}$/.test(origin) && !origins.has(origin)) return json(res, 403, { error: 'Extension access only.' });
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (req.method !== 'POST' || req.headers.authorization !== `Bearer ${pairing.token}`) return json(res, 403, { error: 'Pair this extension with Orbit first.' });
    try { return json(res, 200, await localRequest(req.url.slice('/api/local/'.length), await readBody(req))); }
    catch (error) { return json(res, 400, { error: safeError(error) }); }
  }
  if (req.headers.origin && !origins.has(req.headers.origin)) return json(res, 403, { error: 'Cross-origin requests are not allowed.' });
  if (req.headers['sec-fetch-site'] === 'cross-site' && req.url?.startsWith('/api/')) return json(res, 403, { error: 'Local access only.' });
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, state());
    if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
      if (req.headers['x-orbit-request'] !== '1' || !req.headers['content-type']?.startsWith('application/json')) return json(res, 403, { error: 'Invalid local request.' });
      const body = await readBody(req);
      if (url.pathname === '/api/extension-token') return json(res, 200, { token: pairing.token });
      if (url.pathname === '/api/setup') {
        if (connecting || browser?.session || runPromise || localStep || ['running', 'paused', 'waiting'].includes(run?.status)) throw new Error('End the active session before updating keys.');
        const openai = body.openai || process.env.OPENAI_API_KEY;
        const steel = body.steel || process.env.STEEL_API_KEY;
        if (typeof openai !== 'string' || !/^sk-[A-Za-z0-9_\-]{16,}$/.test(openai) || typeof steel !== 'string' || !/^ste[-_][A-Za-z0-9_\-]{12,}$/.test(steel)) throw new Error('Enter valid OpenAI (sk-…) and Steel (ste-…) keys.');
        if (fs.existsSync(envFile) && fs.lstatSync(envFile).isSymbolicLink()) throw new Error('Cannot save to a symlink.');
        fs.writeFileSync(`${envFile}.tmp`, `OPENAI_API_KEY=${openai}\nSTEEL_API_KEY=${steel}\n`, { mode: 0o600 });
        fs.renameSync(`${envFile}.tmp`, envFile);
        process.env.OPENAI_API_KEY = openai; process.env.STEEL_API_KEY = steel;
        browser = null; computer = null;
        log('success', 'Keys saved locally. Connect your browser to begin.');
        return json(res, 200, { ok: true });
      }
      if (url.pathname === '/api/connect') { await connect(); return json(res, 200, state()); }
      if (url.pathname === '/api/run') {
        if (runPromise || localStep || connecting || run?.status === 'running') throw new Error('Resume or stop the current task first.');
        const task = typeof body.task === 'string' ? body.task.trim() : '';
        if (!task || task.length > 1500) throw new Error('Enter a task between 1 and 1,500 characters.');
        if (!browser?.browser?.isConnected()) throw new Error('Connect the browser first.');
        run = { id: randomUUID(), task, status: 'running', message: 'Reading the page…', spent: 0, steps: 0, history: [] };
        log('user', task); launchLoop();
        return json(res, 200, state());
      }
      if (url.pathname === '/api/pause') { await stop('paused'); return json(res, 200, state()); }
      if (url.pathname === '/api/stop') { await stop('stopped'); return json(res, 200, state()); }
      if (url.pathname === '/api/resume') {
        if (run?.mode === 'local') throw new Error('Resume this task from the floating orb in Chrome.');
        if (!run || !['paused', 'waiting'].includes(run.status) || runPromise) throw new Error('There is no paused task to resume.');
        if (!browser?.browser?.isConnected()) throw new Error('Reconnect your browser first.');
        if (run.steps >= MAX_STEPS) throw new Error('Step limit reached. Stop and start a new task.');
        const answer = typeof body.answer === 'string' ? body.answer.trim().slice(0, 1000) : '';
        if (answer) { run.task = `${run.task}\nUser clarification: ${answer}`.slice(-4000); log('user', answer); }
        run.history.push({ result: 'User has taken over and is ready to continue. Observe the current page again.' });
        run.status = 'running'; run.message = 'Picking up where we left off…'; launchLoop();
        return json(res, 200, state());
      }
      if (url.pathname === '/api/release') {
        if (connecting) throw new Error('Wait for the browser to finish starting.');
        await stop('stopped'); await browser?.release(); log('info', 'Browser ended. Your profile is being saved.');
        return json(res, 200, state());
      }
      return json(res, 404, { error: 'Unknown action.' });
    }
    const files = { '/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css', '/favicon.svg': 'favicon.svg' };
    const file = files[url.pathname];
    if (req.method !== 'GET' || !file) return json(res, 404, { error: 'Not found.' });
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
    res.setHeader('Content-Type', `${types[path.extname(file)]}; charset=utf-8`);
    fs.createReadStream(path.join(root, 'public', file)).pipe(res);
  } catch (error) { json(res, 400, { error: safeError(error) }); }
});
server.listen(port, '127.0.0.1', () => console.log(`Orbit is ready at http://127.0.0.1:${port}`));
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use.` : 'Could not start local server.'); process.exit(1); });
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return; shuttingDown = true;
  const timer = setTimeout(() => process.exit(1), 12000); timer.unref();
  await stop('stopped');
  await browser?.release().catch(() => {});
  await computer?.pause().catch(() => {});
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
