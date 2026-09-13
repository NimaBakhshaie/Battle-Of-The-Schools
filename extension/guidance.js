// Injected in Chrome's isolated world. This module NEVER performs a website action.
export function clearGuidance() {
  globalThis.__orbitGuideCleanup?.();
}

export function showGuidance({ action, observation, runId }) {
  globalThis.__orbitGuideCleanup?.();
  if (location.href !== observation.url) return { ok: false };
  const roots = [document];
  for (let i = 0; i < roots.length; i++) for (const e of roots[i].querySelectorAll('*')) {
    if (e.shadowRoot && !e.id.startsWith('orbit-')) roots.push(e.shadowRoot);
  }
  const info = observation.elements.find(e => e.id === action.target);
  const element = info && roots.flatMap(r => [...r.querySelectorAll(`[data-orbit-id="${Number(action.target)}"]`)])[0];
  const needsTarget = ['click', 'fill', 'press', 'select'].includes(action.action);
  if (needsTarget && (!element || info.disabled || info.sensitive || /\b(checkout|pay|purchase|delete|subscribe|send|publish|confirm)\b/i.test(`${info.label} ${info.href || ''}`))) return { ok: false };
  const host = document.createElement('div'); host.id = 'orbit-guidance';
  host.style.cssText = 'position:fixed!important;inset:0!important;z-index:2147483646!important;pointer-events:none!important;';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `<style>
    *{box-sizing:border-box}.ring{position:fixed;border:3px solid #9570cf;border-radius:9px;box-shadow:0 0 0 5px #bca1e044,0 0 26px #ae7bd966;pointer-events:none;transition:width .12s,height .12s;}
    .hint{position:fixed;width:290px;max-width:calc(100vw - 24px);padding:14px 16px;border:1px solid #decfea;border-radius:14px;background:#fffcff;color:#392b49;box-shadow:0 8px 35px #38204422;font:14px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;pointer-events:auto;}
    .label{font-size:10px;letter-spacing:1.4px;color:#81629e;margin-bottom:6px}.text{overflow-wrap:anywhere}.value{margin-top:6px;color:#705389;overflow-wrap:anywhere}.actions{display:flex;gap:8px;margin-top:10px}button{font:inherit;font-size:12px;color:#705389;border:1px solid #e3d6ed;border-radius:7px;background:#f7f0fc;padding:6px 10px;cursor:pointer}button:focus-visible{outline:2px solid #8060af}
    @media(prefers-reduced-motion:reduce){*{transition:none}}
  </style><div class="ring" hidden></div><aside class="hint" role="status" aria-live="polite"><div class="label">YOUR TURN · ORBIT</div><div class="text"></div><div class="value"></div><div class="actions"><button class="check">Check my progress</button></div></aside>`;
  root.querySelector('.text').textContent = action.message;
  root.querySelector('.value').textContent = ['fill', 'select', 'press', 'navigate'].includes(action.action) ? action.value : '';
  document.documentElement.append(host);
  let timer, delay, finished = false;
  const finish = ok => {
    if (finished) return; finished = true;
    cleanup();
    chrome.runtime.sendMessage({ type: 'ORBIT_GUIDE_RESULT', runId, actionId: action.id, ok }).catch(() => {});
  };
  const cleanup = () => {
    clearInterval(timer); clearTimeout(delay); host.remove();
    document.removeEventListener('click', clicked, true);
    document.removeEventListener('change', changed, true);
    document.removeEventListener('keydown', keyed, true);
    window.removeEventListener('scroll', scrolled, true);
    if (globalThis.__orbitGuideCleanup === cleanup) delete globalThis.__orbitGuideCleanup;
  };
  const clicked = e => {
    if (!e.isTrusted || e.composedPath().some(n => n.id === 'orbit-widget' || n.id === 'orbit-guidance')) return;
    if (action.action === 'click') { const matched = e.composedPath().includes(element); clearTimeout(delay); delay = setTimeout(() => finish(matched), 700); }
  };
  const changed = e => {
    if (e.isTrusted && ['fill', 'select'].includes(action.action) && e.composedPath().includes(element)) {
      clearTimeout(delay); delay = setTimeout(() => finish(true), 500);
    }
  };
  const keyed = e => {
    if (e.isTrusted && e.composedPath().includes(element) &&
        ((action.action === 'press' && e.key === action.value) || (action.action === 'fill' && e.key === 'Enter'))) {
      clearTimeout(delay); delay = setTimeout(() => finish(true), 700);
    }
  };
  const startY = scrollY;
  const scrolled = () => {
    if (action.action === 'scroll' && ((action.value === 'up' && scrollY < startY - 80) || (action.value !== 'up' && scrollY > startY + 80))) {
      clearTimeout(delay); delay = setTimeout(() => finish(true), 500);
    }
  };
  const position = () => {
    if (element && !element.isConnected) { finish(false); return; }
    const hint = root.querySelector('.hint'), ring = root.querySelector('.ring');
    const r = element?.getBoundingClientRect();
    if (r && r.width && r.height) {
      ring.hidden = false;
      Object.assign(ring.style, { left: `${r.left - 5}px`, top: `${r.top - 5}px`, width: `${r.width + 10}px`, height: `${r.height + 10}px` });
      hint.style.left = `${Math.max(12, Math.min(innerWidth - hint.offsetWidth - 12, r.left))}px`;
      hint.style.top = `${Math.max(12, Math.min(innerHeight - hint.offsetHeight - 12, r.bottom + 14 + hint.offsetHeight < innerHeight ? r.bottom + 14 : r.top - hint.offsetHeight - 14))}px`;
    } else { ring.hidden = true; hint.style.left = '18px'; hint.style.bottom = '18px'; }
  };
  root.querySelector('.check').onclick = () => finish(false);
  document.addEventListener('click', clicked, true);
  document.addEventListener('change', changed, true);
  document.addEventListener('keydown', keyed, true);
  window.addEventListener('scroll', scrolled, true);
  globalThis.__orbitGuideCleanup = cleanup;
  position(); timer = setInterval(position, 250);
  return { ok: true };
}
