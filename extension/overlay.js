(() => {
  if (document.getElementById('orbit-widget')) return;
  const host = document.createElement('div'); host.id = 'orbit-widget';
  host.style.cssText = 'all:initial!important;position:fixed!important;top:18px!important;right:18px!important;z-index:2147483647!important;display:block!important;';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `<style>
    :host{color-scheme:light}*{box-sizing:border-box}button,input,textarea{font:inherit}button{cursor:pointer;border:0}button:disabled{opacity:.5;cursor:wait}[hidden]{display:none!important}.wrap{font:12px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#292035;width:310px;display:flex;align-items:flex-end;flex-direction:column;gap:10px;max-width:calc(100vw - 32px)}.orb-button{width:64px;height:64px;border-radius:50%;padding:0;background:radial-gradient(circle at 35% 25%,#f9d9ce 0,#d2acd9 30%,#9a85d4 60%,#5a55a1 100%);box-shadow:0 4px 25px #7357ac44,0 0 0 1px #fff9,inset 0 0 18px #fff5;position:relative;overflow:hidden}.orb-button:after{content:'';position:absolute;inset:-10px;border-radius:50%;background:repeating-radial-gradient(ellipse at 35% 25%,transparent 0 3px,#ffffff66 3.5px 4px,transparent 4.5px 6px);opacity:.55;animation:drift 8s ease-in-out infinite}.orb-button.working{animation:pulse 1.8s ease-in-out infinite}.orb-button.listening{animation:pulse .45s ease-in-out infinite;box-shadow:0 0 30px #d88caf88,0 0 0 5px #f9def077}.card{width:100%;border:1px solid #eee6f0;border-radius:18px;background:#fffcfff7;box-shadow:0 16px 65px #35204426,0 2px 8px #3520440a;backdrop-filter:blur(22px);overflow:hidden}.head{padding:16px 17px 12px;display:flex;align-items:center;gap:8px}.brand{font-weight:650;font-size:18px;letter-spacing:-.8px}.steel{font-size:8px;color:#9b84ae;border:1px solid #eadff0;border-radius:4px;padding:4px 5px;letter-spacing:.5px;margin-left:2px}.minimize{margin-left:auto;background:none;color:#a398ab;font-size:20px;padding:0 4px}.body{padding:0 17px 16px}.subtitle{font-size:11px;color:#a093aa;line-height:1.7;margin:0 0 12px}.status{font-size:10px;line-height:1.65;background:#f5eff9;color:#9075a2;border-radius:8px;padding:9px 11px;max-height:120px;overflow:auto;white-space:pre-wrap;margin-bottom:12px}.task{display:flex;gap:6px;border:1px solid #e6dded;border-radius:9px;background:white;padding:6px}.task textarea{resize:none;width:100%;min-width:0;border:0;outline:0;padding:6px;line-height:1.5;font-size:11px;color:#51445d;background:transparent}.task textarea::placeholder{color:#b1a1ba}.send{align-self:flex-end;background:#eee4f7;color:#9674b0;border-radius:6px;width:28px;height:28px;flex-shrink:0;font-size:19px}.actions{display:flex;gap:7px;margin-top:10px}.mic{background:#8262ab;color:white;border-radius:8px;padding:10px 12px;flex:1;font-size:11px}.secondary{border:1px solid #e8deee;background:transparent;color:#90779f;border-radius:8px;padding:9px;font-size:10px}.setup{width:100%;background:#8161a9;color:white;border-radius:8px;padding:11px;margin-bottom:10px;font-size:11px}.footer{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #eee7f1;padding:10px 17px;color:#a595b0;font-size:9px}.footer button{background:none;font-size:9px;color:#9c85ac;padding:0}.caption{font-size:9px;color:#ae9ebb;margin-top:10px}.mic.live{background:#b97698}select{border:1px solid #e6dded;border-radius:6px;background:#fff;color:#705486;padding:5px;font-size:10px}.orb-button.speaking{animation:voicePulse .65s ease-in-out infinite;box-shadow:0 0 20px #be83f2,0 0 48px #e2a2dc99,0 0 0 5px #c7a0ed33}@keyframes voicePulse{0%,100%{transform:scale(1)}35%{transform:scale(1.09) rotate(2deg)}65%{transform:scale(1.04) rotate(-2deg)}}button:focus-visible{outline:2px solid #ba9cd3;outline-offset:3px}@keyframes pulse{50%{transform:scale(1.07) rotate(3deg)}}@keyframes drift{50%{transform:rotate(35deg) scale(1.12)}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}
  </style><div class="wrap"><button class="orb-button" id="orb" aria-label="Open Orbit chat" title="Orbit · click to open"></button><section class="card" id="card" hidden><div class="head"><span class="brand">orbit</span><span class="steel">STEEL COMPUTER</span><button class="minimize" id="minimize" aria-label="Minimize chat">−</button></div><div class="body"><p class="subtitle">Your tab. Your voice. A little less clicking.</p><div class="status" id="status" role="status">What would you like to do on the web?</div><button class="setup" id="setup" hidden>Connect Orbit ↗</button><div style="display:flex;gap:6px;margin-bottom:10px"><select id="mode" aria-label="Model mode"><option value="dynamic">Dynamic · Luna → Astra</option><option value="low">Low · Luna</option><option value="high">High · Astra</option></select><select id="voice" aria-label="Speaking voice" style="min-width:0;max-width:110px"></select><button id="preview" type="button" aria-label="Preview voice" title="Preview voice">▶</button></div><form class="task" id="form"><textarea id="task" rows="2" maxlength="1500" placeholder="Find school supplies, compare prices…" aria-label="Your instruction"></textarea><button class="send" id="send" type="submit" aria-label="Send instruction">↑</button></form><div class="actions"><button class="mic" id="mic">◉ &nbsp; Talk to Orbit</button><button class="secondary" id="pause" hidden>Pause</button><button class="secondary" id="resume" hidden>Resume</button><button class="secondary" id="stop" hidden>Stop</button></div><button class="secondary" id="wake" style="width:100%;margin-top:10px">Enable “Hello Orbit”</button><div class="caption" id="caption">Send = new task · Resume = continue</div></div><div class="footer"><span id="budget">Luna · $1.80 budget</span><button id="settings">Settings ↗</button></div></section></div>`;
  document.documentElement.append(host);
  const $ = id => root.getElementById(id);
  let state, paired = true, selected = true, busy = false, listening = false, wakeListening = false, recognition, transcript = '', spoken = new Set();
  const send = async (type, extra = {}) => {
    let response;
    try { response = await chrome.runtime.sendMessage({ type, ...extra }); } catch { throw new Error('Extension reloaded. Refresh this page and click Orbit again.'); }
    if (response?.error) throw new Error(response.error);
    if (response?.selected !== undefined) selected = response.selected;
    if (response?.state) { state = response.state; render(type === 'ORBIT_STATUS'); }
    return response;
  };
  function render(silent = false) {
    const run = selected && state?.run?.mode === 'local' ? state.run : null;
    const working = run?.status === 'running', paused = ['paused', 'waiting'].includes(run?.status);
    $('orb').classList.toggle('working', working); $('orb').classList.toggle('listening', listening || wakeListening);
    $('pause').hidden = !working; $('resume').hidden = !paused; $('stop').hidden = !working && !paused;
    $('setup').hidden = paired;
    $('send').disabled = busy || working || !paired; $('mic').disabled = busy || !paired;
    $('budget').textContent = state ? `${run?.model?.replace('gpt-5.6-', '').replace('gpt-6-', '') || $('mode').value} · $${state.budget.spent.toFixed(3)} / $1.80` : 'Luna · $1.80 budget';
    if (run?.message && !listening && !wakeListening) $('status').textContent = run.message;
    if (!paired) $('status').textContent = 'Connect this extension to your local Orbit server once. Your API keys stay out of Chrome.';
    if (working) $('caption').textContent = `Steel Computer · step ${run.steps}/${run.maxSteps} · pause before taking over`;
    else $('caption').textContent = 'Send = new task · Resume = continue';
    if (run && ['running', 'waiting', 'done', 'error', 'limited'].includes(run.status)) {
      const id = `${run.id}:${run.message}`;
      if (!spoken.has(id)) {
        spoken.add(id);
        if (!silent && !listening && !wakeListening && 'speechSynthesis' in window) speak(run.message, run.status === 'waiting' ? run.id : null);
      }
    }
  }
  let voices = [], savedVoice = '';
  let wakeEnabled = false, wakeBlocked = false, wakeRecognition, wakeTimer, commandTimer, awaitingCommand = false, wakeCommand = '', wakePhraseTail = '', wakePhraseTailAt = 0, speaking = false, speechGeneration = 0;
  function loadVoices() {
    const previous = $('voice').value;
    const score = v => /Natural|Enhanced|Premium|Neural/i.test(v.name) ? 100 : /Google US English|Google UK English/i.test(v.name) ? 90 : /Samantha|Ava|Allison|Daniel|Serena/i.test(v.name) ? 80 : 10;
    voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang) && !/Bells|Boing|Bubbles|Cellos|Deranged|Good News|Bad News|Hysterical|Trinoids|Whisper|Zarvox/i.test(v.name)).sort((a,b) => score(b)-score(a)).filter((v,i,a) => a.findIndex(x => x.name === v.name) === i).slice(0,5);
    $('voice').replaceChildren(...voices.map(v => { const option = document.createElement('option'); option.value = v.voiceURI; option.textContent = v.name; return option; }));
    const preferred = voices.find(v => v.voiceURI === (savedVoice || previous)) || voices.find(v => /Samantha|Google US English|Natural|Enhanced/i.test(v.name)) || voices[0];
    if (preferred) $('voice').value = preferred.voiceURI;
  }
  function cancelSpeech() {
    speechGeneration++; speaking = false; speechSynthesis.cancel(); $('orb').classList.remove('speaking');
  }
  function speechText(text) {
    return String(text || '')
      .replace(/\b(?:https?|wss?):\/\/[^\s<>()]+/gi, 'the website')
      .replace(/\bwww\.[^\s<>()]+/gi, 'the website')
      .replace(/\s+([,.;!?])/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  function speak(text, questionRunId = null) {
    const safeText = speechText(text); if (!safeText) return;
    cancelSpeech(); const generation = ++speechGeneration;
    speaking = true; wakeRecognition?.abort();
    const speech = new SpeechSynthesisUtterance(safeText);
    speech.voice = voices.find(v => v.voiceURI === $('voice').value) || null;
    speech.lang = speech.voice?.lang || 'en-US'; speech.rate = 1.02;
    speech.onstart = () => { if (generation === speechGeneration) $('orb').classList.add('speaking'); };
    speech.onend = () => { if (generation !== speechGeneration) return; speaking = false; $('orb').classList.remove('speaking');
      if (questionRunId && selected && state?.run?.id === questionRunId && state.run.status === 'waiting' && !document.hidden) $('mic').onclick();
      else scheduleWake(); };
    speech.onerror = event => { if (generation !== speechGeneration) return; speaking = false; scheduleWake(); $('orb').classList.remove('speaking'); if (!['interrupted', 'canceled'].includes(event.error)) $('caption').textContent = 'Voice unavailable: ' + event.error + '. Try another voice or press Preview.'; };
    speechSynthesis.resume();
    speechSynthesis.speak(speech);
  }
  $('preview').onclick = () => speak('Hi, I’m Orbit. What would you like to do?');
  $('voice').onchange = () => { savedVoice = $('voice').value; chrome.storage.local.set({ voiceURI: $('voice').value }); speak('This is how I sound.'); };
  loadVoices(); speechSynthesis.addEventListener('voiceschanged', loadVoices);
  chrome.storage.local.get(['modelMode', 'voiceURI']).then(saved => { if (saved.modelMode) $('mode').value = saved.modelMode; savedVoice = saved.voiceURI || ''; loadVoices(); });
  $('mode').onchange = () => chrome.storage.local.set({ modelMode: $('mode').value });
  async function act(type, extra) {
    if (busy) return; busy = true; render();
    let failure;
    try { if (type === 'ORBIT_START') speak('Starting Steel Computer.'); await send(type, extra); } catch (error) { failure = error.message; }
    finally { busy = false; render(); scheduleWake(); if (failure) { $('status').textContent = failure; speak(failure); } }
  }
  async function submit() {
    const task = $('task').value.trim(); if (!task || busy) return;
    if (!selected) state = state ? { ...state, run: null } : state;
    selected = true;
    cancelSpeech();
    await act(state?.run?.status === 'waiting' ? 'ORBIT_RESUME' : 'ORBIT_START', state?.run?.status === 'waiting' ? { answer: task } : { task, modelMode: $('mode').value });
    if (state?.run?.status === 'running') $('task').value = '';
  }
  $('form').onsubmit = event => { event.preventDefault(); submit(); };
  $('task').onkeydown = event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } };
  $('orb').onclick = () => $('card').hidden = !$('card').hidden;
  $('minimize').onclick = () => $('card').hidden = true;
  $('setup').onclick = () => act('ORBIT_SETUP'); $('settings').onclick = () => act('ORBIT_SETUP');
  $('pause').onclick = () => act('ORBIT_PAUSE'); $('resume').onclick = async () => { await act('ORBIT_RESUME', { answer: $('task').value.trim() }); if (state?.run?.status === 'running') $('task').value = ''; }; $('stop').onclick = () => act('ORBIT_STOP');
  function setWakeListening(value) { wakeListening = value; render(); }
  function clearWakeCommand() {
    awaitingCommand = false; wakeCommand = ''; wakePhraseTail = ''; wakePhraseTailAt = 0; clearTimeout(commandTimer); setWakeListening(false);
  }
  const wakePattern = /\b(?:hello|hey)(?:\s|,)+(?:(?:orbit)|(?:or\s+bit)|(?:orb\s+it))\b[,.!?]?\s*(.*)/i;
  const wakeEchoPattern = /^(?:hello|hey|orbit|or\s+bit|orb\s+it|hello\s+orbit|hey\s+orbit)[,.!?]*$/i;
  function scheduleWake(delay = awaitingCommand ? 80 : 700) {
    clearTimeout(wakeTimer);
    if (wakeEnabled && !wakeBlocked && !wakeRecognition && !speaking && !listening && !busy && !document.hidden) wakeTimer = setTimeout(startWake, delay);
  }
  function startWake() {
    if (!wakeEnabled || wakeBlocked || wakeRecognition || speaking || listening || document.hidden || busy) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { $('wake').textContent = 'Wake voice unavailable in this browser'; return; }
    const recognizer = new SR(); wakeRecognition = recognizer; let restartDelay;
    recognizer.lang = 'en-US'; recognizer.continuous = !awaitingCommand; recognizer.interimResults = awaitingCommand;
    recognizer.onresult = async event => {
      if (wakeRecognition !== recognizer || speaking || busy) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const words = event.results[i][0].transcript.trim();
        if (!event.results[i].isFinal) {
          if (awaitingCommand) { $('status').textContent = words ? `Listening… ${words}` : 'Listening for your instruction…'; setWakeListening(true); }
          continue;
        }
        const now = Date.now();
        const recentTail = now - wakePhraseTailAt < 2500 ? wakePhraseTail : '';
        const combinedWords = recentTail ? `${recentTail} ${words}` : words;
        const match = combinedWords.match(wakePattern);
        if (match) {
          awaitingCommand = true; wakeCommand = match[1].trim(); wakePhraseTail = ''; wakePhraseTailAt = 0;
          if (wakeEchoPattern.test(wakeCommand)) wakeCommand = '';
          $('status').textContent = 'Listening for your instruction…'; setWakeListening(true);
          clearTimeout(commandTimer);
          commandTimer = setTimeout(() => { clearWakeCommand(); recognizer.abort(); }, 15000);
          if (!wakeCommand) {
            // Chrome commonly ends recognition after the wake phrase. Restart at
            // once in command mode so the user's next sentence is not missed.
            recognizer.abort(); return;
          }
        } else if (awaitingCommand) {
          if (wakeEchoPattern.test(words)) {
            $('status').textContent = 'Listening for your instruction…'; setWakeListening(true);
            recognizer.abort(); return;
          }
          wakeCommand = words;
        } else {
          // Chrome can split the wake phrase into separate final results, such as
          // “Hello” followed by “Orbit”. Keep only a short rolling tail.
          wakePhraseTail = words.split(/\s+/).slice(-3).join(' '); wakePhraseTailAt = now;
        }
        if (awaitingCommand && wakeCommand) {
          const task = wakeCommand; clearWakeCommand(); recognizer.abort();
          if (selected && state?.run?.status === 'running') { await act('ORBIT_PAUSE'); if (state?.run?.status === 'running') return; }
          $('task').value = task; await submit(); scheduleWake(); return;
        }
      }
    };
    recognizer.onerror = event => {
      if (['not-allowed', 'service-not-allowed'].includes(event.error)) {
        wakeBlocked = true; clearWakeCommand(); $('wake').textContent = 'Enable microphone for “Hello Orbit”'; $('status').textContent = 'Allow microphone access, then enable Hello Orbit again.';
      } else if (event.error === 'audio-capture') {
        restartDelay = 1200;
        $('status').textContent = 'The microphone is busy. Still listening for your instruction…';
      }
    };
    recognizer.onend = () => {
      if (wakeRecognition === recognizer) wakeRecognition = null;
      if (awaitingCommand) { setWakeListening(true); $('status').textContent = 'Listening for your instruction…'; }
      scheduleWake(restartDelay);
    };
    try { recognizer.start(); } catch { if (wakeRecognition === recognizer) wakeRecognition = null; scheduleWake(700); }
  }
  $('wake').onclick = async () => {
    wakeEnabled = wakeBlocked || !wakeEnabled; wakeBlocked = false;
    await chrome.storage.local.set({ wakeEnabled });
    $('wake').textContent = wakeEnabled ? '● Hello Orbit on · click to disable' : 'Enable “Hello Orbit”';
    clearTimeout(wakeTimer); wakeRecognition?.abort();
    if (wakeEnabled) { cancelSpeech(); setTimeout(startWake, 0); }
    else clearWakeCommand();
  };
  chrome.storage.local.get(['wakeEnabled', 'wakeSites']).then(saved => {
    wakeEnabled = saved.wakeEnabled === true || saved.wakeSites?.[location.origin] === true;
    if (!wakeEnabled) return;
    $('wake').textContent = '● Hello Orbit on · click to disable';
    if (saved.wakeEnabled !== true) chrome.storage.local.set({ wakeEnabled: true });
    scheduleWake();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(wakeTimer); wakeRecognition?.abort(); } else scheduleWake(); });
  $('mic').onclick = async () => {
    clearTimeout(wakeTimer);
    const wasListening = listening; listening = true; wakeRecognition?.abort();
    if (selected && state?.run?.status === 'running') { await act('ORBIT_PAUSE'); if (state?.run?.status === 'running') { listening = false; scheduleWake(); return; } }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { listening = false; $('status').textContent = 'Speech is unavailable here. Type your instruction instead.'; return; }
    if (wasListening) { recognition?.stop(); return; }
    recognition = new SR(); recognition.lang = 'en-CA'; recognition.interimResults = true; recognition.continuous = false; transcript = '';
    recognition.onstart = () => { listening = true; $('mic').textContent = '◉  Listening…'; $('mic').classList.add('live'); $('status').textContent = 'I’m listening. Say what you need.'; render(); };
    recognition.onresult = event => { transcript = Array.from(event.results).map(r => r[0].transcript).join(' '); $('task').value = transcript; };
    recognition.onerror = event => { transcript = ''; $('status').textContent = event.error === 'not-allowed' ? 'Allow microphone access for this page, or type your task.' : 'Speech recognition was unavailable. You can type your task.'; };
    recognition.onend = () => { listening = false; $('mic').textContent = '◉  Talk to Orbit'; $('mic').classList.remove('live'); render(); if (transcript.trim()) submit(); else scheduleWake(); };
    try { cancelSpeech(); recognition.start(); } catch { listening = false; scheduleWake(); $('status').textContent = 'Could not start speech. Type your instruction instead.'; }
  };
  chrome.runtime.onMessage.addListener(message => { if (message.type === 'ORBIT_STATE') { if (message.state) { selected = true; state = message.state; render(); } if (message.error) { $('status').textContent = message.error; if (!listening && !wakeListening && message.error !== 'Starting your agent on Steel Computer…') speak(message.error); } } });
  async function refresh() {
    if (!host.isConnected) return;
    try { const response = await send('ORBIT_STATUS'); paired = response.paired !== false; selected = response.selected !== false; render(); }
    catch (error) { $('status').textContent = error.message; }
  }
  refresh();
  // Messages also keep the service worker alive while a remote model step is pending.
  const interval = setInterval(refresh, 8000);
  window.addEventListener('pagehide', () => { clearInterval(interval); clearTimeout(wakeTimer); clearTimeout(commandTimer); wakeRecognition?.abort(); cancelSpeech(); transcript = ''; recognition?.abort(); });
})();
