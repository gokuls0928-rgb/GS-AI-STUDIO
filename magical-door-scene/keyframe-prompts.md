# Magical Golden Door — keyframe prompts

Six stills, one character, one look. Every prompt below is fed to the
image model **together with the uploaded character reference image**
(image-to-image / reference mode) so the girl stays pixel-consistent:
same face, same big brown eyes, same pink curly hair, same pink hair
bow, same pink sparkly dress, same proportions.

The two shared blocks (`character lock` + `style lock`) come from
`scene.js` and are appended to every prompt automatically if you
generate them through the studio; paste them manually if you use
another tool.

**Shared character lock**

> The exact same character as the reference image: a cute little girl
> with big brown eyes, pink curly hair, a pink hair bow, a pink
> sparkly dress, identical face, identical hairstyle, identical bow,
> identical dress, identical body proportions, correct hands with five
> fingers, no distortion.

**Shared style lock**

> High-quality 3D animated movie style, vertical 9:16 portrait
> composition, warm pastel magical playroom filled with soft toys and
> fairy lights, cute, dreamy, colorful, soft lighting, polished
> details, cinematic soft depth of field, gentle volumetric light,
> magical golden sparkles floating in the air. No text, no subtitles,
> no captions, no logos, no watermark, no signature, no border, no
> extra characters, no character changes.

---

## 01 — playroom (2.40s, push-in 1.00 → 1.08, ease inOut)

Wide establishing shot, full body. The little girl stands in the
center of the playroom, looking slightly to her right with a soft calm
smile, hands relaxed at her sides. Behind her: plush toys, pastel
blocks, a small rocking horse, warm fairy lights strung across the
wall, a plain pastel wall in front of her with no door yet. Camera at
her eye level, centered, medium-wide framing with head room and floor
visible.

## 02 — door appears (2.20s, push-in 1.04 → 1.12, ease inOut)

Same playroom, same framing, one moment later. A tiny glowing golden
door has just appeared on the wall in front of her, about knee height,
ornate golden frame, warm light leaking around its edges, small golden
sparkles drifting out of the seam. The girl's eyes are wide with
surprise, mouth slightly open, hands lifted a little, body turned
toward the glowing door. Camera at her eye level, medium-wide framing.

## 03 — walking closer (2.05s, push-in 1.02 → 1.16, ease in)

Medium shot, camera closer, slightly lower angle. The girl is mid-step
walking toward the tiny golden door on the wall in front of her, one
foot forward, sparkly pink dress swaying gently, expression excited
and curious, warm smile, the golden door glowing brighter, fairy lights
softly blurred behind her, plush toys out of focus in the background.
Camera at her chest height, she fills the middle of the frame.

## 04 — reach and open (1.85s, push-in 1.00 → 1.14, ease inOut)

Close-up over-the-shoulder shot. Her small hand reaches out and touches
the tiny golden door, the door is just cracking open, a brilliant beam
of warm colorful magical light spilling out around the edges and across
her fingers, her face turned toward the light in three-quarter profile,
eyes sparkling, lips parted in wonder, glowing dust motes in the light
beam, very shallow depth of field, background melted into soft bokeh.

## 05 — fantasy world revealed (1.95s, push-in 1.02 → 1.20, ease out)

The tiny golden door is now fully open. Inside it: a beautiful
miniature fantasy world — glowing flowers, floating butterflies,
sparkling particles, tiny waterfalls of light, candy-colored hills,
bright colorful magical light shining out of the doorway and washing
over the girl's face and dress. She is seen from behind and slightly to
the side, silhouetted with a warm golden rim light, head tilted up in
wonder. Camera just behind her shoulder, push-in framing, the open
golden door is the bright focal point.

## 06 — step toward wonder (2.35s, push-in 1.06 → 1.22, ease out)

Final shot, tighter framing. The girl smiles with pure wonder and takes
one small step toward the open golden door and the miniature fantasy
world glowing inside it, one foot lifted in a small step forward, warm
magical light bathing her face, hair and sparkly pink dress, glowing
flowers and floating butterflies visible in the doorway, golden
sparkles swirling around her. Camera at her eye level, medium close-up,
she is centered, the glowing door in front of her. Soft dreamy bloom,
cinematic depth of field.

---

## Saving the stills

Drop them into `assets/keyframes/` named in shot order:

```
01-playroom.png
02-door-appears.png
03-walking-closer.png
04-reach-and-open.png
05-fantasy-world-revealed.png
06-step-toward-wonder.png
```

Any image extension works (png/jpg/webp); files are picked up in
alphabetical order, so keep the numeric prefixes. Source resolution
does not matter — each still is cover-fitted to the render canvas.

Then render:

```bash
node magical-door-scene/build-video.js
# or from the studio UI: 🎞️ Render Offline Cinematic (ffmpeg)
```
