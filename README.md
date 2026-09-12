> Current-tab extension (v0.3): supports ordinary HTTP/HTTPS websites through Steel Computer. Reload Orbit in chrome://extensions after updating, allow the expanded site permissions, then refresh the website and click Orbit. Send starts a fresh mission; Resume continues the previous mission with the text in the input as clarification. Quantity observations include current count and bounds. Checkout, login/CAPTCHA, and final sensitive actions remain manual. Browser-internal pages and some complex embedded/custom controls are unsupported. The quantity path has local fixture coverage; live site behavior varies.

# Orbit

A Chrome toolbar extension that opens a local voice workspace with an animated, microphone-reactive orb and an embedded live Steel browser. Say “Go to Metro and add eggs to my cart” or type a command. This first version is scoped to Metro.ca and cart additions.

## Start

Requires Node.js 22+ and an OpenAI API key plus a Steel API key. On this Mac, double-click **Start Orbit.command**, which also detects the bundled Codex Node runtime. On another machine:

```sh
npm install
npm start
```

Open http://127.0.0.1:4318 in **Google Chrome**. Click **Set up Orbit**, enter both keys, and choose **Save keys locally**. Keys are written to the approved `.env.local` file with owner-only permissions and are ignored by Git. They are never returned by the server. Updating keys requires ending the browser session first.

## Load the extension

1. In Chrome, open `chrome://extensions`.
2. Turn on **Developer mode** and click **Load unpacked**.
3. Select the `extension` directory in this project.
4. Pin Orbit. Click its icon (or Option+Shift+O) to open the workspace.

The toolbar extension launches a full browser tab so microphone capture and the live browser have enough room. It requires the companion server to remain running. It does not control your existing Chrome tabs or borrow their cookies.

## First task

1. Click **Connect browser**. Steel opens Metro in a new cloud browser, billed separately by Steel. Sessions last at most 15 minutes.
2. Sign into Metro and select your store in the live browser, if needed.
3. Click **Click to talk**, allow the microphone, and speak. Speech is transcribed by Chrome; the completed utterance is submitted automatically. Type instead if speech is unavailable.
4. Watch Orbit work. **Take over** waits for an in-flight action to finish and pauses the agent. Handle login, CAPTCHA, or store selection, then click **Resume**. You can type a clarification while paused.
5. **Stop** stops the task. **End session** releases the Steel browser and saves its profile. Wait for Steel to finish saving before reconnecting.

Clicking **Open view** while paused opens the same Steel session in another tab if the embedded view is too small. Keep that URL private. Close the separate viewer before resuming to avoid competing inputs.

## Cost controls

- Model: **gpt-5.6-luna**, reasoning disabled, 450 output-token limit per decision.
- Standard published rates checked September 12, 2026: $0.20/M input and $1.20/M output. The local meter conservatively charges all input at $0.25/M to allow for cache-write pricing.
- Maximum **18 decisions** and **$0.08** per task, including resumed tasks.
- Maximum **$1.80** in tracked app-wide OpenAI usage. Every request reserves an upper estimate before it is sent. Successful responses reconcile against returned token counts; failed or interrupted calls retain their reservation. No automatic API retries or model upgrades.
- The ledger lives in `.orbit/budget.json` and survives restarts. Keep it intact. It cannot track usage from other apps or infer your actual OpenAI balance. Prices are fixed in code, not fetched dynamically.
- Microphone transcription and spoken responses use browser services; no OpenAI audio or Realtime API calls are made. Chrome speech recognition may send audio to Google's service and may need internet access.
- Steel browser time and any other Steel services are separate from the $1.80 OpenAI cap. Proxy and CAPTCHA solving are not enabled by default.

For illustration, 10,000 input tokens and 1,000 output tokens cost about $0.0032 at standard Luna rates. This is an estimate, not a measured Metro run.

## Implementation and limitations

`server/index.mjs` runs a loopback-only HTTP service. `server/browser.mjs` creates/reuses Steel profiles, connects Playwright over CDP, produces compact DOM observations, and executes a fixed list of browser actions. `server/planner.mjs` asks Luna for strict JSON decisions. The extension never receives an API key. No model-generated JavaScript is executed.

This is an early prototype, not a guarantee of Metro checkout compatibility. Live Metro can require login, a selected store, a CAPTCHA, or site-specific adaptations. Text observations cannot inspect cross-origin iframe contents or complex canvas interfaces; those require human takeover. Navigation is limited to Metro domains, so an external identity provider may require additional integration. The model verifies completion from page observations; ambiguous outcomes need human review. Checkout is excluded. After any uncertain add-to-cart result, inspect the cart before running the task again.

The app is intended for one trusted local user. Do not deploy it publicly without real user authentication and tenant isolation. Chrome sends microphone audio to its speech service; the server sends task text and visible page text to OpenAI. Steel hosts and can record the browser. Browser profiles and live viewer URLs are sensitive.

## Checks

```sh
npm test
TEST_CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

The second command also tests real DOM extraction and actions against a local store fixture. Tests mock the model API and do not spend credits or contact Metro. End-to-end voice and live Steel/Metro testing require your keys and microphone interaction.

Verified during setup: all 9 automated checks passed; desktop and mobile layouts passed; the actual Steel browser connected and Luna searched Metro for egg options. That read-only live task used approximately $0.002 on the conservative OpenAI meter. No groceries were added during the live test. Actual microphone recognition and your account's add-to-cart flow still need an interactive trial. Chrome blocked automated access to its extension-management page, so loading the unpacked toolbar extension is a manual step.

## References

- [Luna model and pricing](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [Steel session configuration](https://docs.steel.dev/overview/sessions-api/configuration)
- [Steel live viewer](https://docs.steel.dev/overview/sessions-api/embed-sessions/live-sessions)
- [Steel profiles](https://docs.steel.dev/overview/profiles-api/overview)
- [Chrome SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
