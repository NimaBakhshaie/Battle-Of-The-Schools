import { snapshotPage, actOnPage } from './page-tools.js';
const SERVER = 'http://127.0.0.1:4318';
let looping = false, preparing = false;
const isWebUrl = value => { try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; } };
async function request(endpoint, body = {}) {
  const { token } = await chrome.storage.local.get('token');
  if (!token) throw new Error('Connect Orbit once to pair this extension.');
  let response;
  try { response = await fetch(`${SERVER}/api/local/${endpoint}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
  catch { throw new Error('Orbit’s local server is offline. Start Orbit.command, then try again.'); }
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Agent request failed.'); return data;
}
async function inject(tabId) { await chrome.scripting.executeScript({ target: { tabId }, files: ['overlay.js'] }); }
async function remember(tabId, state) {
  if (!state?.run || state.run.mode !== 'local') return;
  const key = `memory:${tabId}`;
  const saved = (await chrome.storage.session.get(key))[key] || [];
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  let page = ''; try { const url = new URL(tab.url); page = url.origin + url.pathname; } catch {}
  const entry = { runId: state.run.id, page, task: state.run.task.slice(0, 600), status: state.run.status, outcome: state.run.message.slice(0, 500) };
  const previous = saved.filter(item => item.runId !== entry.runId || item.page !== page);
  await chrome.storage.session.set({ [key]: [...previous, entry].slice(-8) });
}
async function notify(tabId, state, error) {
  await remember(tabId, state);
  const active = await control();
  if (active?.tabId === tabId && state?.run?.id === active.runId) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    await setControl({ ...active, page: tab?.url });
  }
  try { await chrome.tabs.sendMessage(tabId, { type: 'ORBIT_STATE', state, error }); } catch { /* Page is navigating. */ }
}
async function control() { return (await chrome.storage.session.get('control')).control; }
async function setControl(value) { await chrome.storage.session.set({ control: value }); }
async function runLoop() {
  if (looping) return; looping = true;
  let active;
  try {
    while ((active = await control())?.status === 'running') {
      const frames = await chrome.scripting.executeScript({ target: { tabId: active.tabId, allFrames: true }, func: snapshotPage });
      const usable = frames.filter(f => f.result && isWebUrl(f.result.url));
      const top = usable.find(f => f.frameId === 0) || usable[0];
      if (!top) throw new Error('No readable website frame.');
      const targets = new Map(), elements = [];
      // Interleave frames so a navigation-heavy outer shell cannot hide its embedded app.
      for (let row = 0; row < 65 && elements.length < 65; row++) for (const f of usable) {
        const el = f.result.elements[row]; if (!el || elements.length >= 65) continue;
        const id = elements.length + 1; targets.set(id, { frame: f, localId: el.id });
        elements.push({ ...el, id, frameUrl: f.result.url });
      }
      const frame = { result: { ...top.result, elements, text: usable.map(f => `[Frame ${f.frameId}] ${f.result.text.slice(0, Math.floor(6000 / usable.length))}`).join('\n').slice(0, 6500) } };
      const response = await request('step', { runId: active.runId, observation: frame.result });
      await notify(active.tabId, response.state);
      if (!response.action) { await setControl({ ...await control(), status: response.state.run?.status || 'stopped' }); break; }
      const latest = await control();
      if (latest?.status !== 'running' || latest.runId !== active.runId) break;
      const action = response.action;
      let ok = false;
      try {
        if (action.action === 'navigate') {
          if (!isWebUrl(action.value) || /checkout|place.order|paiement/i.test(action.value)) throw new Error('Unsupported destination.');
          await chrome.tabs.update(active.tabId, { url: action.value });
          for (let i = 0; i < 80; i++) { const tab = await chrome.tabs.get(active.tabId); if (tab.status === 'complete') break; await new Promise(resolve => setTimeout(resolve, 250)); }
          await inject(active.tabId); ok = true;
        } else {
          if (!isWebUrl(frame.result.url)) throw new Error('Open an ordinary website to use Orbit.');
          const chosen = targets.get(action.target);
          const destination = chosen?.frame || top;
          const localAction = chosen ? { ...action, target: chosen.localId } : action;
          const [result] = await chrome.scripting.executeScript({ target: { tabId: active.tabId, frameIds: [destination.frameId] }, func: actOnPage, args: [{ action: localAction, observation: destination.result }] });
          ok = result.result?.ok === true;
        }
      } catch { ok = false; }
      const updated = await request('result', { runId: active.runId, actionId: action.id, ok });
      await notify(active.tabId, updated);
      await new Promise(resolve => setTimeout(resolve, action.action === 'wait' ? 2500 : 1200));
    }
  } catch (error) {
    if (active) { await setControl({ ...active, status: 'paused' }); await request('pause', { runId: active.runId }).catch(() => {}); await notify(active.tabId, null, error.message); }
  } finally { looping = false; }
}
chrome.action.onClicked.addListener(async tab => {
  try { await inject(tab.id); }
  catch { await chrome.tabs.create({ url: `${SERVER}/?pair=${chrome.runtime.id}` }); }
});
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status !== 'complete') return;
  const active = await control();
  if (active?.tabId === tabId) { await inject(tabId).catch(() => {}); if (active.status === 'running') runLoop(); }
});
chrome.tabs.onRemoved.addListener(async tabId => {
  await chrome.storage.session.remove(`memory:${tabId}`);
  const active = await control();
  if (active?.tabId === tabId) { await setControl({ ...active, status: 'stopped' }); await request('stop', { runId: active.runId }).catch(() => {}); }
});
chrome.runtime.onMessageExternal.addListener((message, sender, reply) => {
  if (sender.url?.startsWith(`${SERVER}/`) && message.type === 'ORBIT_PAIR' && /^[a-f0-9]{64}$/.test(message.token || '')) {
    chrome.storage.local.set({ token: message.token }).then(() => reply({ ok: true })); return true;
  }
});
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!sender.tab || !message.type?.startsWith('ORBIT_')) return;
  (async () => {
    const tabId = sender.tab.id;
    if (message.type === 'ORBIT_SETUP') { await chrome.tabs.create({ url: `${SERVER}/?pair=${chrome.runtime.id}` }); return { ok: true }; }
    if (message.type === 'ORBIT_STATUS') {
      const { token } = await chrome.storage.local.get('token');
      if (!token) return { paired: false };
      const state = await request('state');
      const active = await control();
      const selected = active?.tabId === tabId && active.runId === state.run?.id && (active.status === 'running' || active.page === sender.tab.url);
      return { paired: true, state: selected ? state : { ...state, run: null }, selected };
    }
    if (message.type === 'ORBIT_START') {
      if (preparing || looping) throw new Error('An agent task is already running.');
      preparing = true;
      try {
        await notify(tabId, null, 'Starting your agent on Steel Computer…');
        await request('connect');
        const savedMemory = (await chrome.storage.session.get(`memory:${tabId}`))[`memory:${tabId}`] || [];
        const url = new URL(sender.tab.url);
        const memory = savedMemory.filter(item => item.page === url.origin + url.pathname);
        const state = await request('start', { task: message.task, modelMode: message.modelMode, memory });
        await remember(tabId, state);
        await setControl({ tabId, runId: state.run.id, status: 'running', page: sender.tab.url });
        runLoop(); return { state };
      } finally { preparing = false; }
    }
    const active = await control();
    if (!active || active.tabId !== tabId) throw new Error('This tab has no active task.');
    if (message.type === 'ORBIT_PAUSE' || message.type === 'ORBIT_STOP') {
      const status = message.type === 'ORBIT_STOP' ? 'stopped' : 'paused';
      await setControl({ ...active, status });
      const state = await request(status === 'stopped' ? 'stop' : 'pause', { runId: active.runId }); return { state };
    }
    if (message.type === 'ORBIT_RESUME') {
      if (looping) throw new Error('The last action is finishing. Resume again in a moment.');
      await request('connect');
      const state = await request('resume', { runId: active.runId, answer: message.answer || '' });
      await setControl({ ...active, status: 'running' }); runLoop(); return { state };
    }
    throw new Error('Unknown extension request.');
  })().then(reply, error => reply({ error: error.message }));
  return true;
});
