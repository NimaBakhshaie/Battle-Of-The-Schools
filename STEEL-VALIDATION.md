# Steel tutor validation — September 12, 2026

## Verified locally

- Real Chrome fixtures: highlighting does not click or type; learner clicks, field changes and Enter advance guidance.
- Wrong-click recovery, pause cleanup, sensitive target rejection, snapshot exclusion of Orbit UI, frame-bound acknowledgements.
- Actual local HTTP server, pairing boundary, static tutor assets and rejection of the old autonomous run endpoint.
- Desktop/mobile layouts, original orb and theme, voice/wake regression checks.
- Remote Python runtime with mocked service boundaries: public inspection, bounded link rehearsal, screenshots, mission files, and learned navigation reused in later guidance.

## Verified live

- The saved Steel key can access the Sessions API from the local Node coordinator (HTTP 200).
- Steel Computer provisioning and remote Python/Playwright installation succeeded.
- No OpenAI calls were made during live infrastructure checks.
- Test computers were paused after the completed attempts; no practice browser was successfully created by these checks.

## Live integration blocker

Inside Steel Computer, Python's request to create a Steel Browser session returns:

```text
POST https://api.steel.dev/v1/sessions
HTTP 403
error code: 1010
```

Cloudflare documents 1010 as a client/browser-signature block. Ask the Steel hackathon team to allow the intended Computer-to-Sessions API client or provide their supported integration route. Orbit does not change client fingerprints to evade the block.

The beta wake operation also intermittently returned 503; fresh-computer provisioning succeeded. The runtime retains the existing safe lifecycle reconciliation and does not replace computers merely because a gateway fails.

Until the API block is resolved, the app reports that it cannot rehearse and can use the learner's current page for guidance. Do not present the practice-browser flow as live-verified, and do not describe fixture screenshots as live Steel evidence.

Rerun after Steel confirms access:

```sh
node --env-file=.env.local tests/steel-tutor-smoke.mjs --live
```

This check uses Steel credits, makes no OpenAI calls, and releases its browser and pauses its test computer afterward. A full interactive extension/model demonstration still needs a successful live run after this check passes.

Reference: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/
