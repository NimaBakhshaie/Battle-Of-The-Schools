// The settings page is silent; only the extension owns spoken guidance.
window.speechSynthesis?.cancel();
window.addEventListener('pagehide', () => window.speechSynthesis?.cancel());
const $ = id => document.getElementById(id);
let current, toastTimer;
const landing = document.querySelector('.orbit-landing');
let extensionId = new URLSearchParams(location.search).get('pair') || document.documentElement.dataset.orbitExtension;
let linked = /^[a-p]{32}$/.test(extensionId || '') && Boolean(window.chrome?.runtime?.sendMessage);
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 6500); }
async function api(endpoint, body = {}) {
 const response = await fetch(`/api/${endpoint}`, {method:'POST', headers:{'Content-Type':'application/json','X-Orbit-Request':'1'},body:JSON.stringify(body)});
 const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed.'); return data;
}
async function extension(type, extra = {}) {
 const result = await chrome.runtime.sendMessage(extensionId, {type, ...extra});
 if (!result || result.error) throw new Error(result?.error || 'Reload the Orbit extension, then reopen its Settings.'); return result;
}
async function refresh() {
 try {
  const response = await fetch('/api/state'); if (!response.ok) throw new Error(); current = await response.json();
  $('connectionLabel').textContent = 'Orbit connected'; $('connectionDot').classList.add('online');
  $('landingNotice').hidden = current.configured; $('landingNotice').textContent = 'Open Settings to connect your keys.';
  for (const name of ['openai','steel','elevenlabs']) $(name+'Status').textContent = current.keys[name] ? 'Saved · leave blank to keep' : '';
  $('landingBudget').textContent = `${current.budget.spent.toFixed(3)} USD used of ${current.budget.limit.toFixed(2)} USD tracked OpenAI budget. Steel usage is separate.`;
 } catch { $('connectionLabel').textContent = 'Server unavailable'; $('connectionDot').classList.remove('online'); }
}
let selectedVoice = 'browser-default';
function loadVoices() {
 const voices = window.speechSynthesis?.getVoices() || [];
 const options = [['browser-default','Browser default'],['elevenlabs','ElevenLabs · Eric'], ...voices.filter(v => /^en/i.test(v.lang)).map(v => [v.voiceURI,v.name])];
 if (!options.some(([id]) => id === selectedVoice)) options.push([selectedVoice,selectedVoice]);
 $('voiceURI').replaceChildren(...options.map(([value,label]) => new Option(label,value)));
 $('voiceURI').value = selectedVoice;
}
$('voiceURI').onchange = () => { selectedVoice = $('voiceURI').value; };
window.speechSynthesis?.addEventListener('voiceschanged',loadVoices); loadVoices();
async function loadPreferences() {
 if (!linked) return;
 try {
  const preferences = await extension('ORBIT_GET_PREFERENCES');
  $('modelMode').value = preferences.modelMode || 'dynamic'; selectedVoice = preferences.voiceURI || 'browser-default'; loadVoices();
  for (const id of ['modelMode','voiceURI','savePreferences']) $(id).disabled = false;
  $('preferencesStatus').textContent = 'Saved choices apply to Orbit across your tabs. Model changes apply to new tasks.';
 } catch(error) { $('preferencesStatus').textContent = error.message; }
}
$('savePreferences').onclick = async () => {
 $('savePreferences').disabled = true;
 try { await extension('ORBIT_SET_PREFERENCES',{modelMode:$('modelMode').value,voiceURI:$('voiceURI').value}); toast('Model and voice saved to your extension.'); }
 catch(error) { $('preferencesStatus').textContent = error.message; }
 finally { $('savePreferences').disabled = false; }
};
$('settingsButton').onclick = () => { $('settingsError').textContent = ''; $('settings').showModal(); loadPreferences(); };
$('closeSettings').onclick = () => $('settings').close();
$('settings').addEventListener('close', () => { for (const id of ['openaiKey','steelKey','elevenlabsKey']) $(id).value = ''; });
$('settingsForm').onsubmit = async event => {
 event.preventDefault(); $('saveKeys').disabled = true; $('settingsError').textContent = '';
 try { await api('setup',{openai:$('openaiKey').value.trim(),steel:$('steelKey').value.trim(),elevenlabs:$('elevenlabsKey').value.trim()}); await refresh(); toast('Keys saved locally.'); }
 catch(error) { $('settingsError').textContent = error.message; }
 finally { $('saveKeys').disabled = false; }
};
$('pairButton').hidden = !linked;
$('pairButton').onclick = async () => {
 try { const {token} = await api('extension-token'); await extension('ORBIT_PAIR',{token}); toast('Extension connected. Return to your website to use Orbit.'); }
 catch(error) { $('settingsError').textContent = error.message; }
};
$('aboutButton').onclick = () => { refresh(); $('aboutOrbit').showModal(); };
$('closeAbout').onclick = () => $('aboutOrbit').close();
document.querySelector('#settings .settings-info p').textContent = 'Up to 60 guidance steps and $0.25 per task; $1.80 total tracked OpenAI usage. Steel uses separate credits.';
refresh(); setInterval(refresh,10000);
if (extensionId) $('settingsButton').click();
const ribbons = [...document.querySelectorAll('.prompt-ribbon')];
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused = motionPreference.matches, orbitTime = 0, lastFrame = 0;
function updateMotionButton() {
  document.body.classList.toggle('motion-paused', motionPaused);
  $('motionButton').setAttribute('aria-pressed', String(motionPaused));
  $('motionButton').textContent = motionPaused ? '▷  Resume motion' : 'Ⅱ  Pause motion';
}
$('motionButton').onclick = () => { motionPaused = !motionPaused; updateMotionButton(); };
motionPreference.addEventListener('change', event => { motionPaused = event.matches; updateMotionButton(); });
updateMotionButton();
function animateLanding(time) {
  if (!motionPaused && !document.hidden && !landing.hidden && lastFrame) orbitTime += Math.min(time-lastFrame, 50);
  lastFrame = time;
  const radius = Math.min(innerWidth * .34, 330);
  ribbons.forEach((ribbon, index) => {
    const angle = orbitTime / 12500 + index * Math.PI * 2 / ribbons.length + .2;
    const depth = Math.sin(angle), x = Math.cos(angle) * radius, y = depth * 93 - x * .23;
    ribbon.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${.85 + (depth+1)*.115}) rotate(${-5-depth*3}deg)`;
    // The opaque orb at z=10 occludes the rear half of each orbit.
    ribbon.style.zIndex = depth < 0 ? '5' : '15';
    ribbon.style.opacity = depth < 0 ? '.65' : '1';
  });
  requestAnimationFrame(animateLanding);
}
requestAnimationFrame(animateLanding);

document.addEventListener('orbit-extension-ready', () => {
 extensionId = document.documentElement.dataset.orbitExtension;
 linked = /^[a-p]{32}$/.test(extensionId || '') && Boolean(window.chrome?.runtime?.sendMessage);
 $('pairButton').hidden = !linked;
 loadPreferences();
});
