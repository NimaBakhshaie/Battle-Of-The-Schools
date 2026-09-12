#!/bin/zsh
cd "${0:A:h}"
if command -v node >/dev/null 2>&1; then
  ORBIT_NODE="$(command -v node)"
elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
  ORBIT_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  print 'Install Node.js 22 or later, then run this file again.'
  read '?Press Enter to close.'
  exit 1
fi
if [[ ! -d node_modules/playwright ]]; then
  print 'Install dependencies with npm install (Node.js required), then run this file again.'
  read '?Press Enter to close.'
  exit 1
fi
print 'Open http://127.0.0.1:4318 in Google Chrome. Keep this window open.'
"$ORBIT_NODE" server/index.mjs
read '?Press Enter to close.'
