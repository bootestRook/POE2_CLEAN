from __future__ import annotations

import argparse
import math
from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = ROOT / "webapp" / "assets" / "items"
DEFAULT_SIZE = 60
DEFAULT_CONTENT_SCALE = 0.85
DEFAULT_BG_TOLERANCE = 52.0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Normalize square AI-generated item art into transparent 60x60 inventory icons."
    )
    parser.add_argument(
        "inputs",
        nargs="*",
        help="Input image files. If omitted, --source-dir must be provided.",
    )
    parser.add_argument(
        "--source-dir",
        type=Path,
        help="Directory of source images. Files are processed in stable filename order.",
    )
    parser.add_argument(
        "--names",
        nargs="+",
        required=True,
        help="Output basenames without extension, in the same order as inputs.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory. Default: {DEFAULT_OUTPUT_DIR}",
    )
    parser.add_argument(
        "--size",
        type=int,
        default=DEFAULT_SIZE,
        help=f"Final icon canvas size. Default: {DEFAULT_SIZE}",
    )
    parser.add_argument(
        "--content-scale",
        type=float,
        default=DEFAULT_CONTENT_SCALE,
        help=f"Portion of the canvas reserved for the object. Default: {DEFAULT_CONTENT_SCALE}",
    )
    parser.add_argument(
        "--bg-tolerance",
        type=float,
        default=DEFAULT_BG_TOLERANCE,
        help=f"Corner-background color tolerance. Default: {DEFAULT_BG_TOLERANCE}",
    )
    parser.add_argument(
        "--preview",
        type=Path,
        help="Optional preview sheet output path under artifacts/ or another safe folder.",
    )
    return parser.parse_args()


def collect_inputs(args: argparse.Namespace) -> list[Path]:
    paths = [Path(value) for value in args.inputs]
    if args.source_dir:
        if paths:
            raise SystemExit("Use either positional inputs or --source-dir, not both.")
        paths = sorted(path for path in args.source_dir.iterdir() if path.is_file())
    if not paths:
        raise SystemExit("No input images provided.")
    if len(paths) != len(args.names):
        raise SystemExit(f"Expected {len(args.names)} input images, got {len(paths)}.")
    return paths


def color_distance(left: tuple[int, int, int], right: tuple[int, int, int]) -> float:
    return math.sqrt(
        (left[0] - right[0]) ** 2
        + (left[1] - right[1]) ** 2
        + (left[2] - right[2]) ** 2
    )


def average_corner_color(image: Image.Image) -> tuple[int, int, int]:
    pixels = image.load()
    width, height = image.size
    sample_span = max(2, round(min(width, height) * 0.02))
    samples: list[tuple[int, int, int]] = []
    corners = [
        (0, 0),
        (width - sample_span, 0),
        (0, height - sample_span),
        (width - sample_span, height - sample_span),
    ]
    for origin_x, origin_y in corners:
        for y in range(origin_y, min(height, origin_y + sample_span)):
            for x in range(origin_x, min(width, origin_x + sample_span)):
                red, green, blue = pixels[x, y][:3]
                samples.append((red, green, blue))
    count = max(1, len(samples))
    return tuple(round(sum(color[index] for color in samples) / count) for index in range(3))


def background_mask(image: Image.Image, tolerance: float) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    corner_color = average_corner_color(rgba)
    visited = set()
    queue = deque([(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)])
    while queue:
        x, y = queue.popleft()
        if (x, y) in visited or x < 0 or y < 0 or x >= width or y >= height:
            continue
        visited.add((x, y))
        red, green, blue, alpha = pixels[x, y]
        if alpha == 0 or color_distance((red, green, blue), corner_color) > tolerance:
            continue
        pixels[x, y] = (0, 0, 0, 0)
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    return rgba


def crop_to_alpha(image: Image.Image) -> Image.Image:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Image is empty after background removal.")
    return image.crop(bounds)


def normalize_icon(source_path: Path, output_path: Path, size: int, content_scale: float, tolerance: float) -> Image.Image:
    with Image.open(source_path) as source:
        transparent = background_mask(source, tolerance)
        cropped = crop_to_alpha(transparent)
        inner_size = max(1, round(size * content_scale))
        scale = min(inner_size / cropped.width, inner_size / cropped.height)
        target_width = max(1, round(cropped.width * scale))
        target_height = max(1, round(cropped.height * scale))
        resized = cropped.resize((target_width, target_height), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    offset_x = (size - target_width) // 2
    offset_y = (size - target_height) // 2
    canvas.alpha_composite(resized, (offset_x, offset_y))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path)
    return canvas


def build_preview(images: list[tuple[str, Image.Image]], preview_path: Path) -> None:
    columns = min(4, max(1, len(images)))
    rows = math.ceil(len(images) / columns)
    cell_size = max(image.width for _name, image in images) + 20
    sheet = Image.new("RGBA", (columns * cell_size, rows * cell_size), (14, 17, 20, 255))
    for index, (_name, image) in enumerate(images):
        col = index % columns
        row = index // columns
        x = col * cell_size + (cell_size - image.width) // 2
        y = row * cell_size + (cell_size - image.height) // 2
        sheet.alpha_composite(image, (x, y))
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(preview_path)


def main() -> None:
    args = parse_args()
    inputs = collect_inputs(args)
    normalized_images: list[tuple[str, Image.Image]] = []
    for source_path, name in zip(inputs, args.names):
        output_path = args.output_dir / f"{name}.png"
        normalized = normalize_icon(source_path, output_path, args.size, args.content_scale, args.bg_tolerance)
        normalized_images.append((name, normalized))
        print(f"saved {output_path}")
    if args.preview:
        build_preview(normalized_images, args.preview)
        print(f"saved {args.preview}")


if __name__ == "__main__":
    main()
