#!/usr/bin/env python3
"""
Generate the planner app icon set with Pillow (no external SVG tooling needed).
Design: rounded squircle tile, blue brand gradient, white calendar with a check.
Run:  python3 generate_icons.py
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SS = 4  # supersample factor for crisp edges

# Brand colors
TOP = (99, 124, 255)      # lighter blue
BOTTOM = (47, 73, 214)    # deeper blue (#2f49d6)
WHITE = (255, 255, 255)
INK = (63, 92, 240)       # #3f5cf0 accent for the checkmark


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vertical_gradient(size, top, bottom):
    img = Image.new("RGB", (1, size), top)
    px = img.load()
    for y in range(size):
        px[0, y] = lerp(top, bottom, y / max(1, size - 1))
    return img.resize((size, size))


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def draw_glyph(draw, cx, cy, s):
    """Draw a white calendar with a blue check, centered at (cx, cy), box size s."""
    half = s / 2
    left, top = cx - half, cy - half
    right, bottom = cx + half, cy + half

    # Binding rings (above the body)
    ring_w = s * 0.10
    ring_h = s * 0.16
    ring_y = top - ring_h * 0.55
    for fx in (0.28, 0.72):
        rx = left + s * fx
        draw.rounded_rectangle(
            [rx - ring_w / 2, ring_y, rx + ring_w / 2, ring_y + ring_h],
            radius=ring_w / 2, fill=WHITE)

    # Calendar body
    body_top = top + s * 0.07
    rad = s * 0.14
    draw.rounded_rectangle([left, body_top, right, bottom], radius=rad, fill=WHITE)

    # Header divider line
    head_y = body_top + s * 0.26
    draw.line([left + s * 0.10, head_y, right - s * 0.10, head_y],
              fill=lerp(INK, WHITE, 0.55), width=max(1, int(s * 0.025)))

    # Checkmark in the lower portion
    lw = max(2, int(s * 0.11))
    p1 = (left + s * 0.26, head_y + s * 0.30)
    p2 = (left + s * 0.43, head_y + s * 0.47)
    p3 = (left + s * 0.76, head_y + s * 0.12)
    draw.line([p1, p2, p3], fill=INK, width=lw, joint="curve")
    r = lw / 2
    for p in (p1, p2, p3):
        draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=INK)


def make_icon(size, maskable=False):
    big = size * SS
    base = vertical_gradient(big, TOP, BOTTOM).convert("RGBA")

    glyph_layer = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glyph_layer)
    # Maskable needs content inside a safe zone (~80%); full-bleed otherwise.
    glyph_box = big * (0.50 if maskable else 0.60)
    draw_glyph(gd, big / 2, big / 2 + big * 0.02, glyph_box)
    base.alpha_composite(glyph_layer)

    if not maskable:
        mask = rounded_mask(big, radius=int(big * 0.225))
        out = Image.new("RGBA", (big, big), (0, 0, 0, 0))
        out.paste(base, (0, 0), mask)
        base = out

    return base.resize((size, size), Image.LANCZOS)


def save(img, name):
    path = os.path.join(HERE, name)
    img.save(path)
    print("wrote", name)


if __name__ == "__main__":
    save(make_icon(192), "icon-192.png")
    save(make_icon(512), "icon-512.png")
    save(make_icon(512, maskable=True), "icon-maskable-512.png")
    save(make_icon(180), "apple-touch-icon.png")
    save(make_icon(32), "favicon-32.png")
    print("done")
