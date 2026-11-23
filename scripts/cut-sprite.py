"""
Turn a generated sprite sheet into a game sprite (M8, DESIGN.md §19).

Input: frames side by side on a solid magenta (#FF00FF) background, any size.
Output: a transparent PNG strip of equal frames, each bottom-centred so the
ground line matches, scaled down and reduced to 256 colours.

    python3 scripts/cut-sprite.py in.png src/ui/town/map/sprites/<id>.png [0.36 | 260px]

Prints the frame size and count to copy into src/ui/town/map/sprites.ts.
Needs Pillow and numpy.
"""
import sys

import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
# Third argument: a scale (0.36) or a frame width in pixels (260px).
size = sys.argv[3] if len(sys.argv) > 3 else "0.36"

im = np.asarray(Image.open(src).convert("RGB")).astype(float)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
magenta = np.minimum(r, b) - g  # how magenta a pixel is
alpha = np.clip((170 - magenta) / 110, 0, 1)
# Un-blend edge and see-through pixels (smoke, glass): seen = a*colour + (1-a)*magenta.
key = np.array([255.0, 0.0, 255.0])
a3 = np.clip(alpha, 0.05, 1)[..., None]
rgb = np.clip((im - (1 - a3) * key) / a3, 0, 255)
# Whatever magenta tint is left, pull red and blue back towards green.
left = np.clip(np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1], 0, None) * (alpha < 1)
rgb[..., 0] -= left * 0.7
rgb[..., 2] -= left * 0.7
rgb = np.clip(rgb, 0, 255)
# Smoke and steam the generator painted over magenta come out lavender: make
# light pinkish-purple pixels plain grey (real purples are darker and stay).
tint = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
lavender = (tint > 12) & (rgb[..., 1] > 90)
grey = rgb.mean(axis=2)
for c in range(3):
    rgb[..., c] = np.where(lavender, grey, rgb[..., c])
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

scale = int(size[:-2]) / w if size.endswith("px") else float(size)
fw, fh = round(w * scale), round(h * scale)
small = sheet.convert("RGBa").resize((fw * len(crops), fh), Image.LANCZOS).convert("RGBA")
small.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(out, optimize=True)
print(f"frames {len(crops)}, frameWidth {fw}, frameHeight {fh}")
