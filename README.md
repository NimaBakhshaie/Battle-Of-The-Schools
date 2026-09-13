# Orbit — learn the web by doing

Orbit keeps the lavender voice orb and floating interface. Ask what you want to accomplish; Orbit highlights **one next control** in your actual Chrome tab. You click, type, choose and navigate. The extension never performs those website actions for you.

## Start

Requires Node 22+, Chrome, an OpenAI key, and a Steel key with **Computer access**. An ElevenLabs key is optional and enables the low-latency “ElevenLabs AI” conversational voice in the extension.

```sh
npm install
npm start
```

Open http://127.0.0.1:4318, save keys, load `extension/` unpacked in Chrome, and refresh the website you want to learn. Click Orbit, connect/pair it once, and ask “Show me how to search this website.” Reload the extension after updates; the new version is 0.5.0.

The first question provisions/resumes Steel Computer and installs Python Playwright in a remote virtual environment. This can take a few minutes. Chromium is not installed: Playwright connects to a separate Steel Browser over CDP. Both Steel services consume credits separately from OpenAI.

## How it works

1. The extension collects a compact current-page observation, including accessible frames and open shadow roots. It sends neither cookies nor password values.
2. The coordinator wakes Steel Computer and installs `server/tutor-runtime.py` plus the shared snapshot function.
3. Steel Computer creates an isolated 15-minute Steel Browser. No learner profile, cookies or login state is copied. Practice uses a public URL without query/fragment.
4. Python Playwright runs **on Steel Computer**, navigates that browser, extracts evidence, and saves a screenshot and observation.
5. The coordinator reserves a model request containing both the learner's current page and the public evidence. That paid request executes on Steel Computer, without automatic retries.
6. Where supported, Steel Computer rehearses the proposed navigation: an unambiguous same-origin public link or a scroll. Arbitrary buttons, form submissions, login and final actions are not rehearsed. Mutating HTTP methods are blocked in the practice browser.
7. The validated action returns to the extension, which draws a purple ring and instruction. It never clicks, fills, presses keys, submits or navigates.
8. A trusted user interaction, navigation, or “Check my progress” triggers a fresh observation. No model calls run while the learner considers a highlight. A click alone never proves the requested outcome.

There is no lesson plan. Guidance adapts one step at a time to the learner's page. Wrong clicks trigger reobservation. Typing finishes on field change/blur or Enter, not every keystroke. Pause removes highlights; Resume rereads the page.

## Watch Orbit work

Choose **Watch Orbit explore** in the floating panel. The themed workspace shows the practice browser, current guidance, actual remote filenames and an on-demand screenshot. A new question from this linked workspace goes to the website tab that opened it. Stop or pause a current question before starting another.

The UI distinguishes:

- **Navigation rehearsed:** public navigation happened in the separate browser. This does not certify the user's outcome.
- **Public page inspected:** evidence exists, but the action was not rehearsed.
- **Guidance from your current page:** the separate browser could not inspect the page, for example because of login, private hosting or a load failure. Orbit does not claim rehearsal.

The practice viewer is for observation. Follow the highlights in your own website tab.

## Computer workspace

Each task uses `/tmp/orbit-agent/missions/<run-id>/` on Steel Computer:

```text
state.json          Browser handle, phase, count and latest evidence filename
events.jsonl        Actual observation/rehearsal/guidance events
observation.json    Latest public-browser snapshot
site-map.json       Observed pages and verified public navigation transitions
guidance.json       Most recent structured instruction
progress.json       Recent user interaction history
evidence-N.png      Public-browser screenshots
```

These files persist on that computer's filesystem between invocations. They are not a durable backup across VM deletion or loss of /tmp. The local coordinator still owns active-run state and cost tracking; a server restart currently requires a new question. This prototype does not claim detached learning or full crash recovery.

| Component | Responsibility |
|---|---|
| Extension | Observe learner's page, highlight, detect user interaction |
| Local Node server | Pairing, budgets, validation, task lifecycle, UI |
| Steel Computer | Playwright/CDP client, public inspection, bounded rehearsal, model calls, evidence and progress files |
| Steel Browser | Isolated public practice website and live viewer |
| OpenAI | Select one next user action from learner's page and public evidence |

Primary files: server/index.mjs, server/computer.mjs, server/tutor-runtime.py, server/planner.mjs, extension/background.js, extension/guidance.js, extension/page-tools.js and extension/overlay.js.

Former autonomous browser helpers remain in server/browser.mjs and actOnPage for fixture coverage, but the tutor extension does not import or call the executor. The public run API no longer starts autonomous shopping.

## Boundaries and costs

- $1.80 tracked OpenAI total, $0.25 per task, 60 non-wait decisions. Fixed code rates, not a live account balance. Keep the .orbit/budget.json ledger when moving installations.
- Every request reserves cost before sending; ambiguous errors retain their reservation.
- Steel Computer: 1 vCPU, 512 MiB, one-hour maximum, 15-minute idle pause. Browsers expire after 15 minutes and are released on completion or Stop. Shutdown also pauses the computer.
- Login, passwords, payment data and final sensitive steps require the user. Some embedded/custom controls and browser-internal pages are unsupported.
- Visible page text goes to Steel Computer and OpenAI; public screenshots and guidance are saved on the computer. The snapshot is not complete personal-data anonymization.
- Chrome speech recognition may send audio to its speech provider. When the ElevenLabs voice is selected, spoken reply text is sent to ElevenLabs for text-to-speech. Keys stay out of the extension; the local server makes the ElevenLabs request.
- Single trusted local user, one active question. Do not expose the loopback server publicly.

## Verification

```sh
npm test
# Include browser fixture tests:
TEST_CHROME_PATH="/path/to/chrome" npm test
```

On PowerShell set $env:TEST_CHROME_PATH before npm test.

tests/tutor.test.mjs verifies highlights never click/type, user interactions advance, wrong clicks reobserve, pause cleanup, sensitive-field rejection, remote transport and desktop/mobile rendering. Screenshots use synthetic fixtures.

An explicit **Steel-billed, no-OpenAI** check is available:

```sh
node --env-file=.env.local tests/steel-tutor-smoke.mjs --live
```

It provisions a test computer, inspects example.com with remote Playwright, checks files, releases the browser and pauses the computer. A fixture test is not a live Steel or end-to-end model run.
