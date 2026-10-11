"""Regenerates the PWA icon set from the supplied CashX app icon.

Optional tool: the icons in `public/assets/icons/` are checked in, so this is
only needed when the brand artwork changes. Requires Python 3 + Pillow.

The source is a 1254px JPEG: the X mark on a rounded gradient square with a
~10% black margin. This crops to the square, then pads the maskable variant out
to full bleed (Android's launcher applies its own mask, so edges must be flat)
using the gradient's own dark edge colour, so the two agree.

Run from the project root:  python tools/make-icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

SRC = Path("public/assets/cashx-app-icon.jpg")
OUT = Path("public/assets/icons")
OUT.mkdir(parents=True, exist_ok=True)

# Measured from the source: the rounded square starts here.
BBOX = (64, 66, 1190, 1184)
# Sampled just inside the square's own corner — matches the gradient's dark edge.
EDGE = (16, 5, 47)
# Corner radius as a fraction of the side, read off the source.
RADIUS = 0.225

src = Image.open(SRC).convert("RGBA").crop(BBOX)
side = src.size[0]
src = src.resize((side, side), Image.LANCZOS) if src.size != (side, side) else src


def rounded_mask(size: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size - 1, size - 1), radius=round(size * RADIUS), fill=255
    )
    return mask


def flat(size: int) -> Image.Image:
    """Square icon, corners rounded — how the mark is meant to be seen."""
    out = Image.new("RGBA", (size, size), EDGE)
    scaled = src.resize((size, size), Image.LANCZOS)
    out.paste(scaled, (0, 0), rounded_mask(size))
    return out


def maskable(size: int) -> Image.Image:
    """Full bleed for adaptive masks: no shaped edges the launcher could clip."""
    out = Image.new("RGBA", (size, size), EDGE)
    out.paste(src.resize((size, size), Image.LANCZOS), (0, 0), rounded_mask(size))
    return out


for name, image in {
    "icon-192.png": flat(192),
    "icon-512.png": flat(512),
    "icon-maskable-512.png": maskable(512),
    "apple-touch-icon-180.png": flat(180),
    "favicon-32.png": flat(32),
}.items():
    path = OUT / name
    image.convert("RGB").save(path, "PNG", optimize=True)
    print(f"{name:26} {image.size[0]:>4}px  {path.stat().st_size:>6} bytes")
