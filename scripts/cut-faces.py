"""
Cut Mike's portrait part sheets (DPBG-0018 to 0024) into the game's face
layers (M8.06, DESIGN.md §19.5). Every layer comes out as a grid of 96px cells
that stack straight on top of a head: the generator drew the parts a little
high, so each sheet gets a nudge (FIT), and a few parts that sit on the
shoulders or brow get their own.

    python3 scripts/cut-faces.py <folder with DPBG-0018...png> src/ui/art/faces

Needs Pillow and numpy (and cut-sprite.py beside it).
"""
import importlib.util
import os
import sys

from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("cut", os.path.join(here, "cut-sprite.py"))
cut = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cut)

CELL = 96
SHEETS = {
    "heads": ["DPBG-0018-Heads.png"],
    "hair": ["DPBG-0019-Hair.png"],
    "beards": ["DPBG-0020-Beards.png"],
    "extras": ["DPBG-0021-Scars.png"],
    "injuries": ["DPBG-0022-Injuries.png"],
    # Two sheets of class headgear, as one layer of 16 (4 x 4).
    "hats": ["DPBG-0023-ClassHats01.png", "DPBG-0024-ClassHats02.png"],
}
# Per layer: scale about the cell centre, then nudge (dx, dy) in output pixels.
# The parts were drawn at the heads' own scale (a beard as wide as the face):
# M8.06 shrank them and Mike saw beards under the eyes, so they stay full size
# now and only move (M8.09).
FIT = {
    "heads": (1.0, 0, 0),
    "hair": (1.0, 0, -2),
    "beards": (1.0, 0, 8),
    "extras": (1.0, 0, 0),
    "injuries": (1.0, 0, 0),
    # Headgear a touch bigger than the head, so hoods and helms close round it (M8.10).
    "hats": (1.06, 0, -7),
}
# Single parts that need their own fit, by layer and cell.
OWN = {
    ("injuries", 0): (1.0, 0, -10),  # the head bandage goes round the brow
    ("injuries", 4): (1.0, 0, 24),  # the sling sits on the shoulder
    ("hats", 0): (1.06, 0, -13),  # miner's cap
    ("hats", 1): (1.06, 0, -11),  # nasal helm
    ("hats", 2): (1.06, 0, -10),  # helmet and coif
    ("hats", 3): (1.06, 0, -15),  # wizard hat
    ("hats", 10): (1.06, 0, -10),  # paladin's great helm
    ("hats", 12): (1.06, 0, -9),  # spellblade's half-helm
    ("hats", 15): (1.1, 0, 24),  # fur collar
}


def cells(path):
    img, _ = cut.key_out(path)
    cw, ch = img.width / 4, img.height / 2
    for i in range(8):
        c, r = i % 4, i // 4
        box = (round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))
        yield img.crop(box).convert("RGBa").resize((CELL, CELL), Image.LANCZOS).convert("RGBA")


def fitted(part, fit):
    s, dx, dy = fit
    w = round(CELL * s)
    p = part.convert("RGBa").resize((w, w), Image.LANCZOS).convert("RGBA")
    out = Image.new("RGBA", (CELL * 3, CELL * 3), (0, 0, 0, 0))
    out.alpha_composite(p, (CELL + round((CELL - w) / 2 + dx), CELL + round((CELL - w) / 2 + dy)))
    return out.crop((CELL, CELL, 2 * CELL, 2 * CELL))


def main(src, dest):
    os.makedirs(dest, exist_ok=True)
    for layer, files in SHEETS.items():
        parts = [p for f in files for p in cells(os.path.join(src, f))]
        rows = len(parts) // 4
        sheet = Image.new("RGBA", (4 * CELL, rows * CELL), (0, 0, 0, 0))
        for i, part in enumerate(parts):
            fit = OWN.get((layer, i), FIT[layer])
            sheet.alpha_composite(fitted(part, fit), ((i % 4) * CELL, (i // 4) * CELL))
        out = os.path.join(dest, f"{layer}.png")
        sheet.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(out, optimize=True)
        print(f"{layer}: {len(parts)} parts, 4x{rows}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
