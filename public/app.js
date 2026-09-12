const $ = id => document.getElementById(id);
const extensionId = new URLSearchParams(location.search).get('pair');
if (/^[a-p]{32}$/.test(extensionId || '')) $('pairBanner').hidden = false;
$('pairButton').onclick = async () => {
  try {
    if (!window.chrome?.runtime?.sendMessage) throw new Error('Load the Orbit extension first, then use its Connect Orbit button.');
    const { token } = await api('extension-token');
    const response = await chrome.runtime.sendMessage(extensionId, { type: 'ORBIT_PAIR', token });
    if (!response?.ok) throw new Error('Pairing failed. Reload the extension and try again.');
    $('pairBanner').hidden = true; toast('Extension connected. Return to Metro and click the Orbit icon.');
  } catch (error) { toast(error.message); }
};
let current = null, busy = false, listening = false, micStarting = false, sound = true, recognition, lastSpeechId = '', lastLogs = '', toastTimer, transcript = '', microphone, audioContext, analyser, audioData;
const toast = message => { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 6500); };
async function api(endpoint, body = {}) {
  const response = await fetch(`/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Orbit-Request': '1' }, body: JSON.stringify(body) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed.'); return data;
}
async function action(endpoint, body) {
  if (busy) return;
  busy = true; render();
  try { await api(endpoint, body); await refresh(); } catch (error) { toast(error.message); }
  finally { busy = false; render(); }
}
function openSettings() { $('settingsError').textContent = ''; $('settings').showModal(); }
$('settingsButton').onclick = openSettings; $('setupButton').onclick = openSettings;
$('closeSettings').onclick = () => $('settings').close();
$('settings').addEventListener('close', () => { $('openaiKey').value = ''; $('steelKey').value = ''; });
$('settingsForm').onsubmit = async event => {
  event.preventDefault(); $('saveKeys').disabled = true; $('settingsError').textContent = '';
  try { await api('setup', { openai: $('openaiKey').value.trim(), steel: $('steelKey').value.trim() }); $('settings').close(); await refresh(); toast('Keys saved. Your browser is ready to connect.'); }
  catch (error) { $('settingsError').textContent = error.message; }
  finally { $('saveKeys').disabled = false; }
};
$('connectButton').onclick = () => { if (!current?.configured) openSettings(); else action('connect'); };
async function submit() {
  const task = $('command').value.trim(); if (!task || busy) return;
  if (!current?.configured) { openSettings(); return; }
  if (!current?.session?.connected) { toast('Connect the browser first, then send your task.'); return; }
  if (current.run?.status === 'running') { toast('Take over or stop the current task first.'); return; }
  if (['paused', 'waiting'].includes(current.run?.status)) await action('resume', { answer: task });
  else await action('run', { task });
  if (current?.run?.status === 'running') $('command').value = '';
}
$('commandForm').onsubmit = event => { event.preventDefault(); submit(); };
$('command').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } });
$('exampleButton').onclick = () => { $('command').value = 'Go to Metro and add one carton of 12 large eggs to my cart.'; $('command').focus(); };
$('takeoverButton').onclick = () => action('pause'); $('shieldPause').onclick = () => action('pause');
$('resumeButton').onclick = () => action('resume'); $('stopButton').onclick = () => action('stop');
$('endButton').onclick = () => action('release');
$('soundButton').onclick = () => { sound = !sound; $('soundButton').textContent = sound ? 'Voice on' : 'Voice off'; $('soundButton').setAttribute('aria-pressed', String(sound)); if (!sound) speechSynthesis.cancel(); };
function speak(message) {
  if (!sound || listening || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(message); utterance.rate = 1.04; utterance.pitch = 1.02; speechSynthesis.speak(utterance);
}
function render() {
  if (!current) return;
  const session = current.session, run = current.run, active = run?.status === 'running', paused = ['paused', 'waiting'].includes(run?.status);
  $('setupBanner').hidden = current.configured;
  $('spend').textContent = `$${current.budget.spent.toFixed(3)}`;
  $('budgetBar').style.width = `${Math.min(100, current.budget.spent / current.budget.limit * 100)}%`;
  $('connectionLabel').textContent = session?.connected ? 'Steel connected' : 'Local workspace'; $('connectionDot').classList.toggle('online', Boolean(session?.connected));
  $('openaiStatus').textContent = current.keys.openai ? 'Saved · leave blank to keep' : ''; $('steelStatus').textContent = current.keys.steel ? 'Saved · leave blank to keep' : '';
  const hasViewer = Boolean(session?.viewerUrl && session.connected);
  $('browserEmpty').hidden = hasViewer; $('viewer').hidden = !hasViewer;
  if (hasViewer && $('viewer').getAttribute('src') !== session.viewerUrl) $('viewer').src = session.viewerUrl;
  if (!hasViewer) $('viewer').removeAttribute('src');
  $('interactionShield').hidden = !hasViewer || !active;
  $('connectButton').disabled = busy || current.connecting;
  $('connectButton').textContent = current.connecting || (busy && !session) ? 'Connecting…' : session && !session.connected ? 'Reconnect browser ↗' : 'Connect browser ↗';
  $('externalViewer').hidden = !hasViewer || active; if (hasViewer) $('externalViewer').href = session.viewerUrl;
  $('takeoverButton').hidden = !active; $('resumeButton').hidden = !paused; $('stopButton').hidden = !active && !paused; $('endButton').hidden = !session;
  for (const id of ['takeoverButton', 'resumeButton', 'stopButton', 'endButton', 'sendButton']) $(id).disabled = busy;
  $('addressLabel').textContent = session?.connected ? 'metro.ca · your private Steel session' : 'Your own cloud browser';
  $('browserLight').classList.toggle('online', Boolean(session?.connected));
  $('browserStatus').textContent = current.connecting ? 'Starting your browser…' : active ? `Orbit is working · step ${run.steps}/${run.maxSteps}` : paused ? 'You’re in control · resume when ready' : session?.connected ? `Connected · ${Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 60000))} min remaining` : 'Ready when you are';
  $('statePill').textContent = listening ? 'Listening' : current.connecting ? 'Connecting' : active ? 'Working' : paused ? 'Your turn' : run?.status === 'done' ? 'Done' : run?.status === 'error' ? 'Needs attention' : 'Ready';
  $('orbTitle').textContent = listening ? 'I’m listening.' : active ? 'On it.' : paused ? 'A little help?' : run?.status === 'done' ? 'All set.' : 'Go on, ask me.';
  $('orbSubtitle').textContent = listening ? 'Say what you need. I’ll take it from here.' : active ? 'One step closer. Watch it happen.' : paused ? 'Take over in the browser, then resume.' : 'The web is better with a little company.';
  const signature = current.logs.map(log => log.id).join(',');
  if (signature !== lastLogs && current.logs.length) {
    lastLogs = signature; $('activity').replaceChildren();
    for (const log of current.logs.slice(-25)) {
      const item = document.createElement('div'); item.className = `activity-item ${log.kind}`;
      const icon = document.createElement('span'); icon.className = 'log-icon'; icon.textContent = ({ user: '↗', action: '↳', success: '✓', error: '!', question: '?' })[log.kind] || '·';
      const text = document.createElement('p'); text.textContent = log.message; item.append(icon, text); $('activity').append(item);
    }
    $('activity').scrollTop = $('activity').scrollHeight;
  }
  if (run && ['done', 'waiting', 'error', 'limited'].includes(run.status)) {
    const id = `${run.id}:${run.steps}:${run.status}`;
    if (id !== lastSpeechId) { lastSpeechId = id; speak(run.message); }
  }
}
async function refresh() {
  try { const response = await fetch('/api/state'); if (!response.ok) throw new Error(); current = await response.json(); render(); }
  catch { $('connectionLabel').textContent = 'Server disconnected'; $('connectionDot').classList.remove('online'); }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
function releaseMic() { microphone?.getTracks().forEach(track => track.stop()); microphone = null; if (audioContext) audioContext.close().catch(() => {}); audioContext = null; analyser = null; }
async function toggleMic() {
  if (!SpeechRecognition) { toast('Voice needs Google Chrome. You can still type your task below.'); return; }
  if (micStarting) return;
  if (listening) { recognition?.stop(); return; }
  if (busy || current?.run?.status === 'running') { toast('Take over before giving another instruction.'); return; }
  speechSynthesis.cancel(); transcript = ''; micStarting = true;
  try {
    microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new AudioContext(); analyser = audioContext.createAnalyser(); analyser.fftSize = 256;
    audioContext.createMediaStreamSource(microphone).connect(analyser); audioData = new Uint8Array(analyser.frequencyBinCount);
    recognition = new SpeechRecognition(); recognition.lang = 'en-CA'; recognition.interimResults = true; recognition.continuous = false;
    recognition.onstart = () => { micStarting = false; listening = true; $('micButton').classList.add('listening'); $('micLabel').textContent = 'Listening…'; $('micButton').setAttribute('aria-label', 'Stop listening'); render(); };
    recognition.onresult = event => { transcript = Array.from(event.results).map(result => result[0].transcript).join(' '); $('command').value = transcript; };
    recognition.onerror = event => { transcript = ''; toast(event.error === 'not-allowed' ? 'Allow microphone access in Chrome to use voice.' : event.error === 'no-speech' ? 'I didn’t catch that. Try again or type your task.' : 'Chrome speech recognition is unavailable. Please type your task.'); };
    recognition.onend = () => { micStarting = false; listening = false; releaseMic(); $('micButton').classList.remove('listening'); $('micLabel').textContent = 'Click to talk'; $('micButton').setAttribute('aria-label', 'Start listening'); render(); if (transcript.trim()) submit(); };
    recognition.start();
  } catch { micStarting = false; releaseMic(); toast('Microphone access failed. Allow it in Chrome, or type a command.'); }
}
$('micButton').onclick = toggleMic;
document.addEventListener('keydown', event => { if (event.altKey && event.code === 'Space' && !$('settings').open) { event.preventDefault(); toggleMic(); } });
window.addEventListener('pagehide', () => { transcript = ''; recognition?.abort(); releaseMic(); });

// A procedural orb: layered, breathing contours. Audio amplitude drives the deformation.
const canvas = $('orb'), ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let amplitude = 0;
function draw(time) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), w = 265, h = 211;
  if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const t = reduced ? 0 : time * .0005;
  let input = 0;
  if (analyser) { analyser.getByteFrequencyData(audioData); input = audioData.reduce((a, b) => a + b, 0) / audioData.length / 130; }
  amplitude += (input - amplitude) * .13;
  const working = current?.run?.status === 'running';
  const energy = reduced ? 0 : listening ? .9 + amplitude * 2.4 : working ? .85 : .3;
  const cx = w / 2, cy = h / 2 + 2, r = 61 + Math.sin(t * 2) * 1.5 + amplitude * 6;
  const halo = ctx.createRadialGradient(cx, cy, 10, cx, cy, 102); halo.addColorStop(0, '#cfb5e629'); halo.addColorStop(.7, '#eee0f528'); halo.addColorStop(1, '#fff0'); ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
  const fill = ctx.createRadialGradient(cx - 20, cy - 27, 3, cx, cy, r); fill.addColorStop(0, '#ffded2'); fill.addColorStop(.36, '#dfaed1'); fill.addColorStop(.73, '#a797df'); fill.addColorStop(1, '#6d68b6');
  ctx.beginPath();
  for (let i = 0; i <= 180; i++) { const a = i / 180 * Math.PI * 2; const rr = r + Math.sin(a * 4 + t * 3) * energy * 2.7 + Math.cos(a * 7 - t * 2) * energy; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.shadowColor = '#a793d777'; ctx.shadowBlur = 27; ctx.fill(); ctx.shadowBlur = 0;
  ctx.save(); ctx.clip();
  for (let j = 0; j < 38; j++) {
    ctx.beginPath(); const off = (j / 37 - .5) * r * 2;
    for (let i = 0; i <= 95; i++) { const x = -r + i / 95 * r * 2; const y = off + Math.sin(x / r * 2.7 + t * 2.3 + j * .105) * (10 + energy * 6) + Math.cos(x / r * 3 - t + j * .12) * 5; i ? ctx.lineTo(cx + x, cy + y) : ctx.moveTo(cx + x, cy + y); }
    ctx.strokeStyle = j < 18 ? '#fff0ed75' : '#eae6ff60'; ctx.lineWidth = .6; ctx.stroke();
  }
  const shade = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r); shade.addColorStop(0, '#fff5e833'); shade.addColorStop(.5, '#ffffff00'); shade.addColorStop(1, '#3e377c44'); ctx.fillStyle = shade; ctx.fillRect(cx - r - 10, cy - r - 10, r * 2 + 20, r * 2 + 20); ctx.restore();
  if (!reduced) requestAnimationFrame(draw);
}
requestAnimationFrame(draw); await refresh(); setInterval(refresh, 1100);
