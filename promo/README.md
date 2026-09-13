# Orbit promotional video

The finished video is rendered from real Orbit UI captures plus brand-matched motion graphics.

Run from the repository root:

```powershell
& 'C:\Users\nimab\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' promo/capture-stills.mjs
& 'C:\Users\nimab\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' promo/record-video.mjs
& 'C:\Users\nimab\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' promo/render-frames.mjs
powershell -ExecutionPolicy Bypass -File promo/encode-video.ps1
& 'C:\Users\nimab\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' promo/verify-video.mjs
```

The final output is `artifacts/orbit-promo/orbit-promo.mp4` (1280×720, about 90 seconds). `orbit-promo.webm` is an intermediate ambient-audio master. The renderer uses a quiet original ambient bed and on-screen copy, so it works without narration. `voiceover.txt` is an optional narration script for a future recorded voice track.
