#!/usr/bin/env python3
"""
Magical Golden Door - frame compositor.

ffmpeg's crop filter cannot re-evaluate its width /
height expressions per frame, so the animated camera
moves are rendered here instead: exact bezier easing,
sub-pixel Lanczos sampling, deterministic frames.

It reads a plan.json written by build-video.js and
produces frame_%05d.jpg which ffmpeg then grades and
encodes.

  * per-shot eased push-in + drift + breathing sway
  * cross-dissolves and one white bloom on the reveal
  * a growing golden light bloom from the tiny door
  * three parallax layers of twinkling sparkles
"""

import json
import math
import os
import sys
from multiprocessing import Pool

import numpy as np
from PIL import Image

# ---------------------------------------------------------
# globals filled by worker_init
# ---------------------------------------------------------

PLAN = None
CANVAS = None          # (w, h)
CANVAS_IMAGES = {}     # shot index -> canvas-sized PIL image
GLOW = None            # float32 (h, w, 3)
SPARKLES = []          # list of dicts: arr, speed, opacity, twinkle_hz, boost


# ---------------------------------------------------------
# easing (same curves as build-video.js)
# ---------------------------------------------------------

def bezier(p1x, p1y, p2x, p2y):

    def A(a1, a2):
        return 1.0 - 3.0 * a2 + 3.0 * a1

    def B(a1, a2):
        return 3.0 * a2 - 6.0 * a1

    def C(a1):
        return 3.0 * a1

    def calc(t, a1, a2):
        return ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t

    def slope(t, a1, a2):
        return 3.0 * A(a1, a2) * t * t + 2.0 * B(a1, a2) * t + C(a1)

    def ease(x):

        if x <= 0.0:
            return 0.0
        if x >= 1.0:
            return 1.0

        t = x
        for _ in range(8):
            s = slope(t, p1x, p2x)
            if abs(s) < 1e-6:
                break
            t -= (calc(t, p1x, p2x) - x) / s
            t = min(1.0, max(0.0, t))

        return calc(t, p1y, p2y)

    return ease


def make_ease(name):

    table = {
        "linear": (0.0, 0.0, 1.0, 1.0),
        "inOut": (0.42, 0.0, 0.58, 1.0),
        "in": (0.55, 0.0, 0.85, 0.35),
        "out": (0.15, 0.6, 0.35, 1.0),
        "dreamy": (0.33, 0.0, 0.15, 1.0),
    }

    return bezier(*table.get(name, table["inOut"]))


# ---------------------------------------------------------
# image helpers
# ---------------------------------------------------------

def cover_fit(img, width, height):
    """Scale to cover the target box, then centre-crop. Never stretches."""

    src_w, src_h = img.size

    scale = max(width / src_w, height / src_h)

    new_w = int(math.ceil(src_w * scale))
    new_h = int(math.ceil(src_h * scale))

    img = img.resize((new_w, new_h), Image.LANCZOS)

    left = (new_w - width) // 2
    top = (new_h - height) // 2

    return img.crop((left, top, left + width, top + height))


def piecewise(points, t):
    """Linear interpolation across a list of {time, value} keyframes."""

    if t <= points[0]["time"]:
        return points[0]["value"]

    if t >= points[-1]["time"]:
        return points[-1]["value"]

    for a, b in zip(points, points[1:]):

        if a["time"] <= t <= b["time"]:

            span = max(1e-6, b["time"] - a["time"])
            k = (t - a["time"]) / span

            return a["value"] + (b["value"] - a["value"]) * k

    return points[-1]["value"]


# ---------------------------------------------------------
# worker setup
# ---------------------------------------------------------

def worker_init(plan):

    global PLAN, CANVAS, CANVAS_IMAGES, GLOW, SPARKLES

    PLAN = plan

    CANVAS = (plan["canvas"]["width"], plan["canvas"]["height"])

    CANVAS_IMAGES = {}

    for index, keyframe in enumerate(plan["keyframes"]):

        with Image.open(keyframe) as img:

            img = img.convert("RGB")
            CANVAS_IMAGES[index] = cover_fit(img, *CANVAS)

    glow_path = plan["textures"]["glow"]

    with Image.open(glow_path) as img:

        img = img.convert("RGB").resize(
            (plan["frame"]["width"], plan["frame"]["height"]),
            Image.LANCZOS,
        )

        GLOW = np.asarray(img, dtype=np.float32)

    SPARKLES = []

    for layer, texture in zip(plan["sparkles"]["layers"], plan["textures"]["sparkles"]):

        with Image.open(texture) as img:

            arr = np.asarray(img.convert("RGB"), dtype=np.float32)

        SPARKLES.append({
            "arr": arr,
            "speed": float(layer["speed"]),
            "opacity": float(layer["opacity"]),
            "twinkle_hz": float(layer["twinkleHz"]),
        })


# ---------------------------------------------------------
# one camera frame
# ---------------------------------------------------------

def shot_frame(shot_index, local_seconds):

    shot = PLAN["shots"][shot_index]

    cam = shot["camera"]

    ease = make_ease(cam["ease"])

    duration = float(shot["duration"])

    x = min(1.0, max(0.0, local_seconds / duration))

    zoom = cam["zoomFrom"] + (cam["zoomTo"] - cam["zoomFrom"]) * ease(x)

    canvas_w, canvas_h = CANVAS

    win_w = canvas_w / zoom
    win_h = canvas_h / zoom

    t = local_seconds

    # gentle breathing sway so no shot feels frozen
    sway_x = 0.0016 * canvas_w * math.sin(2 * math.pi * 0.075 * t + shot_index * 1.7)
    sway_y = 0.0022 * canvas_h * math.sin(2 * math.pi * 0.055 * t + shot_index * 2.3)

    drift_y = cam.get("driftY", 0.0) * canvas_h * x

    center_x = canvas_w / 2.0 + sway_x
    center_y = canvas_h / 2.0 + drift_y + sway_y

    left = center_x - win_w / 2.0
    top = center_y - win_h / 2.0

    left = min(max(left, 0.0), canvas_w - win_w)
    top = min(max(top, 0.0), canvas_h - win_h)

    frame = CANVAS_IMAGES[shot_index].resize(
        (PLAN["frame"]["width"], PLAN["frame"]["height"]),
        Image.LANCZOS,
        box=(left, top, left + win_w, top + win_h),
    )

    return np.asarray(frame, dtype=np.float32)


# ---------------------------------------------------------
# global frame
# ---------------------------------------------------------

def compose(global_frame):

    fps = float(PLAN["fps"])

    seconds = global_frame / fps

    timeline = PLAN["timeline"]

    base = None

    for entry in timeline:

        if entry["startFrame"] <= global_frame < entry["endFrame"]:

            local = (global_frame - entry["startFrame"]) / fps

            base = shot_frame(entry["shotIndex"], local)

            break

    if base is None:

        last = timeline[-1]
        local = (global_frame - last["startFrame"]) / fps
        base = shot_frame(last["shotIndex"], min(local, float(last["duration"])))

    # ---- cross-dissolves ----

    for transition in PLAN["transitions"]:

        start = transition["startFrame"]
        end = transition["endFrame"]

        if start <= global_frame < end:

            span = max(1, end - start)
            alpha = (global_frame - start) / span

            # smoothstep so dissolves feel optical, not linear
            alpha = alpha * alpha * (3.0 - 2.0 * alpha)

            a = shot_frame(transition["fromShot"], (global_frame - transition["fromStartFrame"]) / fps)
            b = shot_frame(transition["toShot"], (global_frame - transition["toStartFrame"]) / fps)

            base = a * (1.0 - alpha) + b * alpha

            if transition["type"] == "fadewhite":

                # bloom through white at the midpoint of the dissolve
                bloom = math.sin(math.pi * alpha) ** 2.2 * 0.92
                base = base * (1.0 - bloom) + 255.0 * bloom

            break

    frame_w = PLAN["frame"]["width"]
    frame_h = PLAN["frame"]["height"]

    # ---- golden magical light ----

    glow_points = PLAN["glow"]["keyframes"]

    opacity = piecewise(glow_points, seconds)

    if opacity > 0.001:

        # screen blend: black in the texture stays
        # transparent, the bloom only ever adds light
        glow = GLOW * np.float32(opacity)
        base = 255.0 - (255.0 - base) * (255.0 - glow) / 255.0

    # ---- three parallax sparkle layers ----

    boost = PLAN["sparkles"].get("boost", {})
    boost_from = float(boost.get("from", 1e9))
    boost_to = float(boost.get("to", -1e9))
    boost_strength = float(boost.get("strength", 0.0))

    for layer in SPARKLES:

        arr = layer["arr"]
        tile_h, tile_w = arr.shape[0], arr.shape[1]

        shift_y = int(math.floor(layer["speed"] * seconds)) % tile_h
        shift_x = int(round((6 + layer["twinkle_hz"] * 3) * math.sin(2 * math.pi * 0.05 * seconds)))

        rolled = np.roll(arr, -shift_y, axis=0)

        if shift_x:
            rolled = np.roll(rolled, shift_x, axis=1)

        if tile_h != frame_h or tile_w != frame_w:
            rolled = rolled[:frame_h, :frame_w, :]

        level = layer["opacity"]

        if boost_from <= seconds <= boost_to:
            level = min(1.0, level + boost_strength)

        twinkle = 0.72 + 0.28 * math.sin(2 * math.pi * layer["twinkle_hz"] * seconds)
        alpha = np.float32(level * twinkle)

        # screen blend again - particles add light,
        # the black tile background adds nothing
        lit = rolled * alpha
        base = 255.0 - (255.0 - base) * (255.0 - lit) / 255.0

    return np.clip(base, 0, 255).astype(np.uint8)


def render_frame(global_frame):

    out_dir = PLAN["framesDir"]

    image = Image.fromarray(compose(global_frame), "RGB")

    path = os.path.join(out_dir, "frame_%05d.jpg" % global_frame)

    image.save(path, quality=96, subsampling=0)

    return path


# ---------------------------------------------------------
# main
# ---------------------------------------------------------

def main():

    plan_path = sys.argv[1] if len(sys.argv) > 1 else "assets/cache/plan.json"

    with open(plan_path, "r") as handle:
        plan = json.load(handle)

    total_frames = int(plan["totalFrames"])

    os.makedirs(plan["framesDir"], exist_ok=True)

    workers = max(1, min(int(os.environ.get("GS_RENDER_WORKERS", "2")), os.cpu_count() or 1))

    print("  composing %d frames at %dx%d (%d workers)" % (
        total_frames,
        plan["frame"]["width"],
        plan["frame"]["height"],
        workers,
    ))

    done = 0

    if workers == 1:

        worker_init(plan)

        for index in range(total_frames):
            render_frame(index)
            done += 1
            if done % 25 == 0:
                print("    %d/%d frames" % (done, total_frames))

    else:

        with Pool(processes=workers, initializer=worker_init, initargs=(plan,)) as pool:

            for _ in pool.imap_unordered(render_frame, range(total_frames), chunksize=4):

                done += 1

                if done % 25 == 0:
                    print("    %d/%d frames" % (done, total_frames))

    print("  frames ready: %d" % done)


if __name__ == "__main__":
    main()
