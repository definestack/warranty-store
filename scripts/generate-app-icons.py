#!/usr/bin/env python3
"""Generate every app-identity asset in assets/ from the committed logo master.

Run this only when the logo changes:

    python scripts/generate-app-icons.py

Python 3 with Pillow is required *for this script alone* - it is a development
tool and takes no part in building or running the app. Changing app icons needs
a native rebuild (`npm run android`) before a device shows them.

The master (assets/logo-master.png) is a flat raster on a near-white ground, so
the mark is cut out by chroma: the artwork is saturated purple, the ground and
its drop shadow are not. Interior detail that reads as white - the "W" and the
bar beneath it - is recovered as holes in the folder mask, which is what makes
the monochrome themed layer legible: those holes stay as negative space instead
of being flattened away.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MASTER = REPO_ROOT / "assets" / "logo-master.png"
DEFAULT_OUT = REPO_ROOT / "assets"

# --- Cut-out tuning -------------------------------------------------------
# Chroma (max channel - min channel) cleanly separates the artwork from the
# ground in the supplied master: the ground and its drop shadow sit at 20 or
# below, the mark at 48 or above. 32 is the middle of that gap.
CHROMA_THRESHOLD = 32
# Splits the mark into the dark folder body and the pale sheets/highlights.
FOLDER_LUMA_MAX = 150
# Softens the hard cut-out by about a pixel so downscaled edges are not jagged.
EDGE_BLUR_RADIUS = 0.8
# Anything less saturated than this is ground, including the shadow.
GROUND_CHROMA_MAX = 20

# --- Framing --------------------------------------------------------------
ICON_SIZE = 1024
ADAPTIVE_SIZE = 1024
SPLASH_SIZE = 1024
FAVICON_SIZE = 196

# Android's adaptive icon is a 108dp canvas of which only a 66dp-diameter
# centred circle is guaranteed visible; the rest can be clipped by the
# launcher's mask or cropped as it animates the layers in parallax.
SAFE_CIRCLE_DIAMETER = round(ADAPTIVE_SIZE * 66 / 108)  # 626 px

# Longest edge of the mark as a fraction of the canvas.
ICON_MARK_FRACTION = 0.77  # matches the mark-to-tile ratio in the master
SPLASH_MARK_FRACTION = 0.90
FAVICON_MARK_FRACTION = 0.94


def log(message: str) -> None:
    print(message)


def bounds(mask: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.where(mask)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def fill_holes(mask: np.ndarray) -> np.ndarray:
    """Return `mask` with every region it encloses filled in."""
    image = Image.fromarray(np.where(mask, 0, 255).astype(np.uint8)).convert("RGB")
    ImageDraw.floodfill(image, (0, 0), (255, 0, 0), thresh=0)
    reached = np.asarray(image)
    outside = (reached[:, :, 0] == 255) & (reached[:, :, 1] == 0) & (reached[:, :, 2] == 0)
    return ~outside


def soften(mask: np.ndarray) -> Image.Image:
    """Hard boolean mask -> 8-bit alpha with roughly a pixel of anti-aliasing."""
    alpha = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8))
    return alpha.filter(ImageFilter.GaussianBlur(EDGE_BLUR_RADIUS))


class Mark:
    """The cut-out logo and the sub-masks the derived assets need."""

    def __init__(self, master: Image.Image):
        rgb = np.asarray(master.convert("RGB")).astype(np.int16)
        chroma = rgb.max(2) - rgb.min(2)
        luma = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]

        self.rgb = rgb.astype(np.uint8)
        self.solid = fill_holes(chroma >= CHROMA_THRESHOLD)
        self.bbox = bounds(self.solid)

        folder = self.solid & (luma < FOLDER_LUMA_MAX)
        # The "W" and the bar beneath it are light regions enclosed by the
        # folder body. The sheets are light too, but they open to the outside,
        # so they are not holes and stay part of the silhouette.
        self.holes = fill_holes(folder) & ~folder
        self.background = self._sample_ground(rgb, chroma)

    def _sample_ground(self, rgb: np.ndarray, chroma: np.ndarray) -> tuple[int, int, int]:
        """Median ground colour, sampled clear of the mark, its shadow and the
        outer margin, so it is the tile the mark actually sits on."""
        height, width = chroma.shape
        inset = round(0.12 * width)
        pad = round(0.03 * width)
        x0, y0, x1, y1 = self.bbox
        region = np.zeros(chroma.shape, dtype=bool)
        region[inset:height - inset, inset:width - inset] = True
        region[max(0, y0 - pad):min(height, y1 + 4 * pad),
               max(0, x0 - 2 * pad):min(width, x1 + 2 * pad)] = False
        region &= chroma <= GROUND_CHROMA_MAX
        if not region.any():
            fail("no ground left to sample the brand colour from")
            return (255, 255, 255)
        return tuple(int(round(v)) for v in np.median(rgb[region], axis=0))

    def cutout(self, mask: np.ndarray | None = None,
               flat: tuple[int, int, int] | None = None) -> Image.Image:
        """The mark, cropped to its bounding box, transparent outside `mask`."""
        shape = self.solid if mask is None else mask
        if flat is None:
            rgb = self.rgb
        else:
            rgb = np.empty_like(self.rgb)
            rgb[:, :] = flat
        image = Image.fromarray(rgb).convert("RGBA")
        image.putalpha(soften(shape))
        x0, y0, x1, y1 = bounds(shape)
        return image.crop((x0, y0, x1 + 1, y1 + 1))


def place(mark: Image.Image, canvas: int, longest_edge: int,
          background: tuple[int, int, int] | None = None,
          transparent_rgb: tuple[int, int, int] = (0, 0, 0)) -> Image.Image:
    """Scale `mark` so its longest edge is `longest_edge` px and centre it.

    `transparent_rgb` is the colour left under the transparent area; a
    silhouette wants white there so that scaling it never bleeds dark pixels
    into its edges.
    """
    scale = longest_edge / max(mark.size)
    size = (max(1, round(mark.width * scale)), max(1, round(mark.height * scale)))
    resized = mark.resize(size, Image.LANCZOS)
    fill = transparent_rgb + (0,) if background is None else background + (255,)
    out = Image.new("RGBA", (canvas, canvas), fill)
    out.alpha_composite(resized, ((canvas - size[0]) // 2, (canvas - size[1]) // 2))
    if background is None:
        # Compositing onto a transparent canvas leaves black under the fully
        # transparent pixels; hold them at `transparent_rgb` instead.
        pixels = np.asarray(out).copy()
        clear = pixels[:, :, 3] == 0
        pixels[clear, :3] = transparent_rgb
        out = Image.fromarray(pixels)
    return out


def safe_circle_edge(mark: Image.Image) -> int:
    """Longest edge that keeps the mark's bounding box inside the safe circle.

    A w x h box fits inside a circle of diameter d only when its diagonal does,
    so the longest edge is capped at d * longest / hypot(w, h).
    """
    diagonal = math.hypot(mark.width, mark.height)
    return int(SAFE_CIRCLE_DIAMETER * max(mark.size) / diagonal)


# --- Assertions -----------------------------------------------------------

FAILURES: list[str] = []


def fail(message: str) -> None:
    FAILURES.append(message)
    print(f"  FAIL: {message}", file=sys.stderr)


def check_size(image: Image.Image, name: str, expected: int) -> None:
    if image.size != (expected, expected):
        fail(f"{name} is {image.width}x{image.height}, expected {expected}x{expected}")


def check_opaque(image: Image.Image, name: str) -> None:
    if image.mode != "RGB":
        fail(f"{name} is mode {image.mode}, expected RGB with no alpha channel")


def check_transparent_margin(image: Image.Image, name: str) -> None:
    alpha = np.asarray(image.getchannel("A"))
    edges = np.concatenate([alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]])
    if edges.any():
        fail(f"{name} runs to the canvas edge - it must have a transparent margin")


def check_safe_circle(image: Image.Image, name: str) -> None:
    alpha = np.asarray(image.getchannel("A"))
    if not alpha.any():
        fail(f"{name} is empty")
        return
    x0, y0, x1, y1 = bounds(alpha > 0)
    centre = (image.width - 1) / 2
    radius = SAFE_CIRCLE_DIAMETER / 2
    worst = max(math.hypot(x - centre, y - centre)
                for x, y in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)))
    if worst > radius:
        fail(f"{name} overflows the {SAFE_CIRCLE_DIAMETER}px safe circle - its bounding "
             f"box reaches {worst:.0f}px from centre, limit {radius:.0f}px")
    else:
        log(f"    safe circle: bounding box reaches {worst:.0f}px of {radius:.0f}px")


def check_flat(image: Image.Image, name: str, colour: tuple[int, int, int]) -> None:
    pixels = np.asarray(image.convert("RGB")).reshape(-1, 3)
    if not (pixels == np.array(colour)).all():
        fail(f"{name} is not a flat {colour}")


def check_monochrome(image: Image.Image, name: str) -> None:
    rgb = np.asarray(image.convert("RGB")).reshape(-1, 3)
    if not (rgb == 255).all():
        fail(f"{name} carries colour - its shape must live in the alpha channel alone")
    alpha = np.asarray(image.getchannel("A"))
    x0, y0, x1, y1 = bounds(alpha > 0)
    interior = alpha[y0:y1 + 1, x0:x1 + 1]
    if (interior == 0).sum() < 0.01 * interior.size:
        fail(f"{name} has no interior negative space - it would read as a blob")


# --- Assets ---------------------------------------------------------------

def build(master_path: Path, out_dir: Path, brand: tuple[int, int, int] | None,
          preview_dir: Path | None) -> int:
    master = Image.open(master_path)
    log(f"master: {master_path} {master.width}x{master.height} {master.mode}")
    if master.width != master.height:
        fail(f"master is not square ({master.width}x{master.height})")
    if master.width < 1024:
        fail(f"master is {master.width}px, at least 1024px is required")
    if FAILURES:
        return 1

    mark = Mark(master)
    x0, y0, x1, y1 = mark.bbox
    log(f"mark: {x1 - x0 + 1}x{y1 - y0 + 1} at ({x0},{y0})")

    sampled = mark.background
    brand = brand or sampled
    origin = "sampled from the master" if brand == sampled else f"supplied, master reads #{sampled[0]:02X}{sampled[1]:02X}{sampled[2]:02X}"
    log(f"brand background: #{brand[0]:02X}{brand[1]:02X}{brand[2]:02X} ({origin})")

    colour = mark.cutout()
    silhouette = mark.cutout(mark.solid & ~mark.holes, flat=(255, 255, 255))

    out_dir.mkdir(parents=True, exist_ok=True)

    log("icon.png")
    icon = place(colour, ICON_SIZE, round(ICON_SIZE * ICON_MARK_FRACTION), brand).convert("RGB")
    check_size(icon, "icon.png", ICON_SIZE)
    check_opaque(icon, "icon.png")
    icon.save(out_dir / "icon.png", optimize=True)

    log("android-icon-foreground.png")
    foreground = place(colour, ADAPTIVE_SIZE, safe_circle_edge(colour))
    check_size(foreground, "android-icon-foreground.png", ADAPTIVE_SIZE)
    check_transparent_margin(foreground, "android-icon-foreground.png")
    check_safe_circle(foreground, "android-icon-foreground.png")
    foreground.save(out_dir / "android-icon-foreground.png", optimize=True)

    log("android-icon-background.png")
    background = Image.new("RGB", (ADAPTIVE_SIZE, ADAPTIVE_SIZE), brand)
    check_size(background, "android-icon-background.png", ADAPTIVE_SIZE)
    check_opaque(background, "android-icon-background.png")
    check_flat(background, "android-icon-background.png", brand)
    background.save(out_dir / "android-icon-background.png", optimize=True)

    log("android-icon-monochrome.png")
    monochrome = place(silhouette, ADAPTIVE_SIZE, safe_circle_edge(silhouette),
                       transparent_rgb=(255, 255, 255))
    check_size(monochrome, "android-icon-monochrome.png", ADAPTIVE_SIZE)
    check_transparent_margin(monochrome, "android-icon-monochrome.png")
    check_safe_circle(monochrome, "android-icon-monochrome.png")
    check_monochrome(monochrome, "android-icon-monochrome.png")
    monochrome.save(out_dir / "android-icon-monochrome.png", optimize=True)

    log("splash-icon.png")
    splash = place(colour, SPLASH_SIZE, round(SPLASH_SIZE * SPLASH_MARK_FRACTION))
    check_size(splash, "splash-icon.png", SPLASH_SIZE)
    check_transparent_margin(splash, "splash-icon.png")
    splash.save(out_dir / "splash-icon.png", optimize=True)

    log("favicon.png")
    # No simplification: checked at 16px the whole mark still reads as a folder
    # with a W, so dropping the sheets would only make it a different mark from
    # the launcher icon for no gain. Re-check that at 16px if the logo changes.
    favicon = place(colour, FAVICON_SIZE, round(FAVICON_SIZE * FAVICON_MARK_FRACTION))
    check_size(favicon, "favicon.png", FAVICON_SIZE)
    check_transparent_margin(favicon, "favicon.png")
    favicon.save(out_dir / "favicon.png", optimize=True)

    if preview_dir:
        write_previews(preview_dir, icon, foreground, background, monochrome, splash, favicon)

    if FAILURES:
        print(f"\n{len(FAILURES)} check(s) failed - the assets above are not fit to ship",
              file=sys.stderr)
        return 1
    log(f"\nall checks passed; six assets written to {out_dir}")
    log("app.json android.adaptiveIcon.backgroundColor must be "
        f"#{brand[0]:02X}{brand[1]:02X}{brand[2]:02X}")
    return 0


def apply_mask(image: Image.Image, shape: str) -> Image.Image:
    size = image.width
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    if shape == "circle":
        draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    else:
        draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=round(size * 0.22), fill=255)
    out = image.copy()
    out.putalpha(mask)
    return out


def write_previews(preview_dir: Path, icon: Image.Image, foreground: Image.Image,
                   background: Image.Image, monochrome: Image.Image, splash: Image.Image,
                   favicon: Image.Image) -> None:
    """Renders that exist only to be looked at - never written to assets/."""
    preview_dir.mkdir(parents=True, exist_ok=True)

    for size in (16, 32):
        small = favicon.resize((size, size), Image.LANCZOS)
        on_white = Image.new("RGBA", small.size, (255, 255, 255, 255))
        on_white.alpha_composite(small)
        on_white.convert("RGB").resize((size * 8, size * 8), Image.NEAREST) \
            .save(preview_dir / f"favicon-at-{size}px.png")

    for name, ground in (("light", (255, 255, 255)), ("dark", (18, 18, 20))):
        canvas = Image.new("RGBA", splash.size, ground + (255,))
        canvas.alpha_composite(splash)
        canvas.convert("RGB").resize((360, 360), Image.LANCZOS) \
            .save(preview_dir / f"splash-on-{name}.png")

    for shape in ("circle", "squircle"):
        layers = background.convert("RGBA")
        layers.alpha_composite(foreground)
        apply_mask(layers, shape).resize((360, 360), Image.LANCZOS) \
            .save(preview_dir / f"adaptive-{shape}.png")

    themed = Image.new("RGBA", monochrome.size, (58, 60, 78, 255))
    tint = Image.new("RGBA", monochrome.size, (214, 220, 255, 255))
    tint.putalpha(monochrome.getchannel("A"))
    themed.alpha_composite(tint)
    apply_mask(themed, "circle").resize((360, 360), Image.LANCZOS) \
        .save(preview_dir / "themed-icon.png")

    icon.resize((180, 180), Image.LANCZOS).save(preview_dir / "icon-at-180px.png")


def parse_colour(value: str) -> tuple[int, int, int]:
    text = value.lstrip("#")
    if len(text) != 6:
        raise argparse.ArgumentTypeError(f"expected #RRGGBB, got {value!r}")
    try:
        return tuple(int(text[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        raise argparse.ArgumentTypeError(f"expected #RRGGBB, got {value!r}") from None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--master", type=Path, default=DEFAULT_MASTER,
                        help="logo master (default: assets/logo-master.png)")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT,
                        help="output directory (default: assets/)")
    parser.add_argument("--brand-color", type=parse_colour, default=None,
                        help="brand background as #RRGGBB (default: sampled from the master)")
    parser.add_argument("--preview", type=Path, default=None,
                        help="also write review renders (masked adaptive icon, themed icon, "
                             "splash on both backgrounds, favicon at 16px) here")
    args = parser.parse_args()
    return build(args.master, args.out, args.brand_color, args.preview)


if __name__ == "__main__":
    sys.exit(main())
