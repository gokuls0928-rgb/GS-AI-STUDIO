#!/usr/bin/env python3
"""
Magical Golden Door - texture generator.

Builds the overlay textures used by build-video.js:

  * sparkles-far.png / sparkles-mid.png / sparkles-near.png
      Seamless vertical tiles of glowing golden, pink and white
      particles. They are scrolled upwards by ffmpeg to create
      three parallax layers of drifting magic dust.

  * golden-glow.png
      A warm radial bloom placed over the frame. Its opacity is
      animated by ffmpeg so the magical light grows as the tiny
      golden door opens.

Only Pillow + numpy are required.

Usage:
    python3 particles.py --out assets/cache \
        --width 1080 --height 1920 --seed 7
"""

import argparse
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


# ---------------------------------------------------------
# helpers
# ---------------------------------------------------------

def seamless_dot(canvas, x, y, radius, color, height):
    """Draw a soft glowing dot that wraps around the vertical edges."""

    draw = ImageDraw.Draw(canvas, "RGBA")

    for offset in (0, height, -height):

        cy = y + offset

        if cy < -radius * 4 or cy > height + radius * 4:
            continue

        steps = 6
        for i in range(steps, 0, -1):

            t = i / steps
            r = radius * (1.0 + 2.6 * t)
            alpha = int(color[3] * (1.0 - t) ** 2.2)

            if alpha <= 0:
                continue

            draw.ellipse(
                [x - r, cy - r, x + r, cy + r],
                fill=(color[0], color[1], color[2], alpha),
            )

    # bright core
    core = max(0.6, radius * 0.45)
    for offset in (0, height, -height):
        cy = y + offset
        if cy < -core * 4 or cy > height + core * 4:
            continue
        draw.ellipse(
            [x - core, cy - core, x + core, cy + core],
            fill=(255, 252, 240, min(255, color[3] + 60)),
        )


def star_flare(canvas, x, y, size, color, height):
    """Draw a four-point sparkle flare, wrapped vertically."""

    draw = ImageDraw.Draw(canvas, "RGBA")

    for offset in (0, height, -height):

        cy = y + offset

        if cy < -size * 2 or cy > height + size * 2:
            continue

        # horizontal + vertical rays
        for angle in (0, math.pi / 2):
            dx = math.cos(angle) * size
            dy = math.sin(angle) * size
            draw.line(
                [(x - dx, cy - dy), (x + dx, cy + dy)],
                fill=color,
                width=max(1, int(size * 0.16)),
            )

        # diagonal shorter rays
        for angle in (math.pi / 4, 3 * math.pi / 4):
            dx = math.cos(angle) * size * 0.55
            dy = math.sin(angle) * size * 0.55
            draw.line(
                [(x - dx, cy - dy), (x + dx, cy + dy)],
                fill=(color[0], color[1], color[2], int(color[3] * 0.6)),
                width=max(1, int(size * 0.1)),
            )

        draw.ellipse(
            [x - size * 0.18, cy - size * 0.18, x + size * 0.18, cy + size * 0.18],
            fill=(255, 255, 250, min(255, color[3] + 40)),
        )


def build_sparkle_layer(width, tile_height, count, min_r, max_r, rng):
    """One seamless particle tile."""

    canvas = Image.new("RGBA", (width, tile_height), (0, 0, 0, 0))

    palette = [
        (255, 226, 150, 235),   # warm gold
        (255, 240, 200, 225),   # pale gold
        (255, 196, 226, 215),   # pink
        (255, 255, 255, 235),   # white hot
        (206, 232, 255, 190),   # cool fairy light
    ]

    for _ in range(count):

        x = float(rng.uniform(0, width))
        y = float(rng.uniform(0, tile_height))
        r = float(rng.uniform(min_r, max_r))
        color = palette[int(rng.integers(0, len(palette)))]

        alpha_scale = float(rng.uniform(0.55, 1.0))
        color = (color[0], color[1], color[2], int(color[3] * alpha_scale))

        seamless_dot(canvas, x, y, r, color, tile_height)

        # a few bright star flares
        if rng.random() < 0.22:
            star_flare(
                canvas,
                x,
                y,
                r * float(rng.uniform(3.0, 5.5)),
                color,
                tile_height,
            )

    # soft bokeh bubbles
    bokeh = int(max(3, count * 0.10))
    for _ in range(bokeh):

        x = float(rng.uniform(0, width))
        y = float(rng.uniform(0, tile_height))
        r = float(rng.uniform(max_r * 2.2, max_r * 4.5))
        tint = palette[int(rng.integers(0, 3))]

        ring = Image.new("RGBA", (width, tile_height), (0, 0, 0, 0))
        rd = ImageDraw.Draw(ring, "RGBA")

        for offset in (0, tile_height, -tile_height):
            cy = y + offset
            rd.ellipse(
                [x - r, cy - r, x + r, cy + r],
                outline=(tint[0], tint[1], tint[2], 46),
                width=max(2, int(r * 0.14)),
            )
            rd.ellipse(
                [x - r, cy - r, x + r, cy + r],
                fill=(tint[0], tint[1], tint[2], 12),
            )

        ring = ring.filter(ImageFilter.GaussianBlur(r * 0.22))
        canvas = Image.alpha_composite(canvas, ring)

    return canvas.filter(ImageFilter.GaussianBlur(0.5))


def build_glow(width, height, cx_frac, cy_frac, radius_frac):
    """Warm magical bloom, brightest at the doorway."""

    cx = cx_frac * width
    cy = cy_frac * height
    radius = radius_frac * height

    ys, xs = np.mgrid[0:height, 0:width].astype(np.float32)

    dx = (xs - cx) / (radius * 0.72)
    dy = (ys - cy) / radius

    dist = np.sqrt(dx * dx + dy * dy)

    # core falloff
    core = np.exp(-(dist ** 2.0) * 2.1)
    halo = np.exp(-(dist ** 1.35) * 1.25) * 0.55

    field = np.clip(core + halo, 0.0, 1.0)

    # light rays fanning out of the doorway
    angle = np.arctan2(ys - cy, xs - cx)
    rays = 0.5 + 0.5 * np.sin(angle * 11.0)
    ray_mask = np.clip(rays * np.exp(-dist * 1.15) * 0.30, 0.0, 1.0)

    field = np.clip(field + ray_mask, 0.0, 1.0)

    r = (255.0 * np.clip(field * 1.05, 0, 1))
    g = (214.0 * np.clip(field * 1.02, 0, 1) + 24.0 * np.clip(field ** 3, 0, 1))
    b = (150.0 * np.clip(field * 0.85, 0, 1) + 60.0 * np.clip(field ** 4, 0, 1))

    alpha = np.clip(field ** 1.15, 0, 1) * 255.0

    rgba = np.dstack([r, g, b, alpha]).astype(np.uint8)

    img = Image.fromarray(rgba, "RGBA")
    return img.filter(ImageFilter.GaussianBlur(6))


# ---------------------------------------------------------
# main
# ---------------------------------------------------------

def main():

    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    parser.add_argument("--width", type=int, default=1080)
    parser.add_argument("--height", type=int, default=1920)
    parser.add_argument("--tile", type=int, default=0,
                        help="sparkle tile height (default: 2x frame height)")
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--glow-x", type=float, default=0.5)
    parser.add_argument("--glow-y", type=float, default=0.44)
    parser.add_argument("--glow-radius", type=float, default=0.75)
    parser.add_argument("--layers", default="far:90:1.2:3.0,mid:55:2.4:5.5,near:26:5.0:11.0")

    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)

    tile_h = args.tile or (args.height * 2)

    rng = np.random.default_rng(args.seed)

    made = []

    for spec in args.layers.split(","):

        name, count, min_r, max_r = spec.split(":")

        layer = build_sparkle_layer(
            args.width,
            tile_h,
            int(count),
            float(min_r),
            float(max_r),
            rng,
        )

        out_path = os.path.join(args.out, f"sparkles-{name}.png")
        layer.save(out_path)
        made.append(out_path)
        print(f"  sparkle layer  {name:<5} {args.width}x{tile_h} -> {out_path}")

    glow = build_glow(
        args.width,
        args.height,
        args.glow_x,
        args.glow_y,
        args.glow_radius,
    )

    glow_path = os.path.join(args.out, "golden-glow.png")
    glow.save(glow_path)
    made.append(glow_path)
    print(f"  golden glow    {args.width}x{args.height} -> {glow_path}")

    print(f"textures ready: {len(made)} files")


if __name__ == "__main__":
    main()
