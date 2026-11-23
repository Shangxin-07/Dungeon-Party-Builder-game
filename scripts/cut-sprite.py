"""
Turn a generated sprite sheet into a game sprite (M8, DESIGN.md §19).

Input: frames side by side on a solid magenta (#FF00FF) background, any size.
Output: a transparent PNG strip of equal frames, each bottom-centred so the
ground line matches, scaled down and reduced to 256 colours.

    python3 scripts/cut-sprite.py in.png src/ui/town/map/sprites/<id>.png [scale]

Prints the frame size and count to copy into src/ui/town/map/sprites.ts.
Needs Pillow and numpy.
"""
import sys

import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 0.36

im = np.asarray(Image.open(src).convert("RGB")).astype(float)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
magenta = np.minimum(r, b) - g  # how magenta a pixel is
alpha = np.clip((170 - magenta) / 110, 0, 1)
# Pull the magenta spill out of edge pixels.
spill = np.clip(magenta, 0, None)
rgb = im.copy()
edge = alpha < 1
for c in (0, 2):
    rgb[..., c] = np.where(edge, np.clip(im[..., c] - spill * (1 - alpha) - spill * 0.5, 0, 255), im[..., c])
img = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), "RGBA")

# Frames are the runs of columns with something in them.
cols = (alpha > 0.15).any(axis=0)
frames, start = [], None
for x, filled in enumerate(list(cols) + [False]):
    if filled and start is None:
        start = x
    if not filled and start is not None:
        if x - start > 50:
            frames.append((start, x))
        start = None

crops = []
for x0, x1 in frames:
    part = img.crop((x0, 0, x1, img.height))
    crops.append(part.crop(part.getbbox()))
w = int(max(c.width for c in crops) * 1.04)
h = max(c.height for c in crops)
sheet = Image.new("RGBA", (w * len(crops), h), (0, 0, 0, 0))
for i, c in enumerate(crops):
    sheet.paste(c, (i * w + (w - c.width) // 2, h - c.height), c)

fw, fh = round(w * scale), round(h * scale)
small = sheet.convert("RGBa").resize((fw * len(crops), fh), Image.LANCZOS).convert("RGBA")
small.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(out, optimize=True)
print(f"frames {len(crops)}, frameWidth {fw}, frameHeight {fh}")
