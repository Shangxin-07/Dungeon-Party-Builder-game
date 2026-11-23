"""
Turn a picture generated on solid magenta (#FF00FF) into game art (M8, DESIGN.md §19).
Needs Pillow and numpy. Output is transparent and reduced to 256 colours.

Building sprites: frames side by side, any size. Each frame is bottom-centred
so the ground line matches. Prints the numbers for src/ui/town/map/sprites.ts.

    python3 scripts/cut-sprite.py in.png src/ui/town/map/sprites/<id>.png [0.36 | 260px]

Icon sheets: a grid of equal cells, read across then down. Each icon is
trimmed, scaled to fit and centred in a square cell of the given size, so a
slightly uneven grid from the generator still comes out even.

    python3 scripts/cut-sprite.py in.png src/ui/art/icons/<sheet>.png --grid 4x3 64
"""
import sys

import numpy as np
from PIL import Image

def key_out(path):
    """Load a picture on magenta and return it as RGBA with the magenta keyed out."""
    im = np.asarray(Image.open(path).convert("RGB")).astype(float)
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
    return img, alpha


def strip(src, out, size):
    img, alpha = key_out(src)
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


def blobs(img):
    """Each solid patch of the sheet: (label grid, list of (label, centre y, centre x, (h, w)))."""
    import numpy as np
    from collections import deque

    solid = np.array(img)[:, :, 3] > 40
    h, w = solid.shape
    label = np.zeros((h, w), dtype=np.int32)
    found = []
    for y0, x0 in zip(*np.nonzero(solid)):
        if label[y0, x0]:
            continue
        n = len(found) + 1
        label[y0, x0] = n
        todo, sy, sx, count = deque([(y0, x0)]), 0, 0, 0
        top, left, bottom, right = y0, x0, y0, x0
        while todo:
            y, x = todo.popleft()
            sy, sx, count = sy + y, sx + x, count + 1
            top, left, bottom, right = min(top, y), min(left, x), max(bottom, y), max(right, x)
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not label[ny, nx]:
                    label[ny, nx] = n
                    todo.append((ny, nx))
        found.append((n, sy / count, sx / count, (bottom - top + 1, right - left + 1)))
    return label, found


def grid(src, out, cols, rows, cell):
    import numpy as np

    img, _ = key_out(src)
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (0, 0, 0, 0))
    cw, ch = img.width / cols, img.height / rows
    pad = max(1, cell // 16)
    # Each patch belongs to the cell its middle sits in, so a staff that pokes
    # into the row below stays whole and leaves no stray tip behind. Patches
    # that run across cells (icons touching their neighbours) are cut on the grid.
    label, found = blobs(img)
    pixels = np.array(img)
    joined = [n for n, _, _, (h, w) in found if h > 1.2 * ch or w > 1.2 * cw]
    for i in range(cols * rows):
        c, r = i % cols, i // cols
        mine = [
            n
            for n, y, x, _ in found
            if int(x // cw) == c and int(y // ch) == r and n not in joined
        ]
        rect = np.zeros(label.shape, dtype=bool)
        rect[round(r * ch) : round((r + 1) * ch), round(c * cw) : round((c + 1) * cw)] = True
        keep = np.isin(label, mine) | (rect & np.isin(label, joined))
        if not keep.any():
            continue  # an empty cell
        ys, xs = np.nonzero(keep)
        part = pixels.copy()
        part[~keep] = 0
        part = Image.fromarray(part).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        fit = (cell - 2 * pad) / max(part.width, part.height)
        w, h = max(1, round(part.width * fit)), max(1, round(part.height * fit))
        part = part.convert("RGBa").resize((w, h), Image.LANCZOS).convert("RGBA")
        sheet.alpha_composite(part, (c * cell + (cell - w) // 2, r * cell + (cell - h) // 2))
    sheet.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(out, optimize=True)
    print(f"grid {cols}x{rows}, cell {cell}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--grid" in args:
        i = args.index("--grid")
        cols, rows = (int(n) for n in args[i + 1].split("x"))
        cell = int(args[i + 2]) if len(args) > i + 2 else 64
        grid(args[0], args[1], cols, rows, cell)
    else:
        # Third argument: a scale (0.36) or a frame width in pixels (260px).
        strip(args[0], args[1], args[2] if len(args) > 2 else "0.36")
