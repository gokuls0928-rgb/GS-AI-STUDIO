# ✨ Magical Golden Door — 10s vertical 9:16 cinematic

A complete, reproducible pipeline for the scene:

> A cute little girl (big brown eyes, pink curly hair, pink hair bow,
> pink sparkly dress) stands in a warm pastel magical playroom. A tiny
> glowing golden door appears on the wall. She walks to it, opens it,
> and a miniature fantasy world of glowing flowers, floating
> butterflies and sparkling particles shines out. She smiles with
> wonder and takes one small step inside.

Two ways to produce the video:

| Route | What it uses | Character fidelity | Needs |
|---|---|---|---|
| **A. Magic Hour** (`/api/generate` with `references`, or `/api/image-to-video`) | seedance-2.5 / kling-3.0 / minimax-h3 … | true generative animation locked to the uploaded reference image | `MAGIC_HOUR_API_KEY` + credits |
| **B. Offline cinematic renderer** (`build-video.js`) | 6 character-consistent keyframes + ffmpeg | keyframes generated from the reference image; motion is cinematic 2.5D camera work | only `ffmpeg` + `python3 (Pillow, numpy)` |

Route B ships fully working in this repo and costs zero credits.

---

## Scene anatomy

```
scene.js               single source of truth: shots, camera moves,
                       transitions, glow keyframes, sparkle layers, grade
particles.py           builds the sparkle tiles + golden glow textures
compose-frames.py      renders all 300 frames (bezier camera moves,
                       cross-dissolves, white reveal bloom, screen-blended
                       light + sparkles) with exact sub-pixel sampling
build-video.js         orchestrates everything, then lets ffmpeg apply
                       the cinematic grade and encode H.264
keyframe-prompts.md    the exact prompts for the 6 character-locked stills
assets/keyframes/      the 6 stills (generated, git-ignored)
assets/cache/          textures, plan.json, frame cache (git-ignored)
output/                magical-door-10s-9x16.mp4 (git-ignored)
```

### Timeline (10.00s exactly)

| # | shot | length | camera | transition into next |
|---|---|---|---|---|
| 1 | playroom | 2.40s | push-in 1.00→1.08 | fade 0.60s |
| 2 | door appears | 2.20s | push-in 1.04→1.12 | fade 0.50s |
| 3 | walking closer | 2.05s | push-in 1.02→1.16 | fade 0.45s |
| 4 | reach & open | 1.85s | push-in 1.00→1.14 | **fadewhite 0.70s** |
| 5 | fantasy world revealed | 1.95s | push-in 1.02→1.20 | fade 0.55s |
| 6 | step toward wonder | 2.35s | push-in 1.06→1.22 | — |

`timeline = Σshots − Σtransitions = 13.60 − 2.80 = 10.00s`, verified by
`build-video.js` on every run.

Every camera move is a cubic-bezier eased push-in (CSS-style curves,
sampled and refitted so the easing survives inside the renderer), plus
a slow vertical drift and a barely-visible sine "breathing" sway so no
shot ever feels frozen. Sparkles are three parallax layers scrolling at
26/48/82 px/s with independent twinkle frequencies; the golden light
bloom follows opacity keyframes that peak at the reveal (t≈6.8s).

---

## Render it

```bash
# from the repo root
npm start                                   # serve the studio on :3000
# UI → Video Generator → 🎞️ Render Offline Cinematic (ffmpeg)

# or straight from the CLI
node magical-door-scene/build-video.js --status
node magical-door-scene/build-video.js
```

Environment knobs (all optional):

| variable | meaning |
|---|---|
| `GS_FFMPEG` | explicit ffmpeg binary path |
| `GS_PYTHON` | python with Pillow + numpy |
| `GS_KEYFRAMES` | alternate keyframe folder (e.g. another character take) |
| `GS_RENDER_WORKERS` | parallel frame workers (default 2) |

Useful flags: `--status`, `--dry-run`, `--keep-frames`, `--no-textures`.

Output: `magical-door-scene/output/magical-door-10s-9x16.mp4`
(1080×1920, 30 fps, H.264 high, ~10s, no audio, no text/watermark).

---

## Swapping in the real character

1. Upload the character reference image in the studio (or drop it into
   `assets/reference/`).
2. Generate the six stills with the prompts in
   `keyframe-prompts.md`, **with the reference image attached** so the
   face, eyes, hair, bow, dress and proportions stay identical.
3. Save them as `assets/keyframes/01-…06-….png`.
4. Re-render (`build-video.js` or the UI button).

Everything downstream — timing, camera, light, sparkles, grade — is
unchanged, so the swap is purely an asset replacement.

---

## HTTP surface (server.js)

| endpoint | purpose |
|---|---|
| `GET /api/status` | backend health, capabilities, model lists |
| `GET /api/presets` | scene presets (magical-door prompt + settings) |
| `POST /api/generate` | text→video; add `references[]` (multipart) to lock a character |
| `POST /api/image-to-video` | animate an uploaded still (`image`, optional `endImage`) |
| `POST /api/scene/magical-door` | one-shot preset render with character references |
| `POST /api/render/local` | offline ffmpeg cinematic render (no key needed) |
| `GET /output/...` | generated videos |
| `GET /magical-door-scene/assets/...` | keyframes & textures for the UI |

Magic Hour routes need `MAGIC_HOUR_API_KEY` in `.env`
(see `.env.example`). Without it the backend still serves everything
else, and the offline renderer keeps working.
