#!/usr/bin/env python3
"""
OAR Clothing Texture Extraction Pipeline

Parses LLWearable clothing files from extracted OAR regions,
resolves texture UUID references, converts JP2→PNG, and outputs
an organized catalog with metadata.

Usage:
    python3 extract_oar_textures.py [--output DIR] [--region REGION_NAME]

Defaults to processing all GREEN-tier OAR regions.
"""

import os
import re
import json
import shutil
import argparse
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional

# SL clothing type enum
CLOTHING_TYPES = {
    0: "shape",
    1: "skin",
    2: "hair",
    3: "eyes",
    4: "shirt",
    5: "pants",
    6: "shoes",
    7: "socks",
    8: "jacket",
    9: "gloves",
    10: "undershirt",
    11: "underpants",
    12: "skirt",
    13: "alpha",
    14: "tattoo",
    15: "physics",
    16: "universal",
}

# SL texture layer IDs → human-readable names
TEXTURE_LAYERS = {
    0: "head_bodypaint",
    1: "upper_shirt",
    2: "lower_pants",
    3: "eyes_iris",
    4: "hair_grain",
    5: "upper_bodypaint",
    6: "lower_bodypaint",
    7: "lower_shoes",
    8: "head_baked",
    9: "upper_baked",
    10: "lower_baked",
    11: "eyes_baked",
    12: "upper_jacket",
    13: "upper_undershirt",
    14: "lower_underpants",
    15: "lower_skirt",
    16: "upper_gloves",
    17: "upper_tattoo",
    18: "lower_tattoo",
    19: "head_tattoo",
    20: "head_alpha",
    21: "upper_alpha",
    22: "lower_alpha",
}

# GREEN-tier OAR regions (CC-0 or own work)
GREEN_REGIONS = [
    "virtually_human",
    "avatar_center",
    "freebie_mall",
    "business_district_v7_3",
    "tropical",
    "western_town",
    "autumn_castle",
    "lk_urban_city",
]

EXTRACTED_OARS_ROOT = Path("/home/p0qp0q/blackbox/Legacy/docs/v0_archive/extracted_oars")


@dataclass
class TextureRef:
    layer_id: int
    layer_name: str
    texture_uuid: str
    source_jp2: Optional[str] = None
    output_png: Optional[str] = None
    converted: bool = False


@dataclass
class ClothingItem:
    uuid: str
    name: str
    clothing_type: str
    type_id: int
    creator_id: str
    source_region: str
    source_file: str
    license: str
    textures: list = field(default_factory=list)
    parameters: dict = field(default_factory=dict)


def parse_llwearable(filepath: Path, region_name: str) -> Optional[ClothingItem]:
    """Parse an LLWearable .txt file into a ClothingItem."""
    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None

    lines = text.strip().split("\n")
    if len(lines) < 2 or not lines[0].startswith("LLWearable version"):
        return None

    item_name = lines[1].strip()
    uuid = filepath.stem.replace("_clothing", "").replace("_bodypart", "")

    # Extract creator_id
    creator_id = ""
    creator_match = re.search(r"creator_id\s+([0-9a-f-]+)", text)
    if creator_match:
        creator_id = creator_match.group(1)

    # Extract type
    type_match = re.search(r"^type\s+(\d+)", text, re.MULTILINE)
    type_id = int(type_match.group(1)) if type_match else -1
    clothing_type = CLOTHING_TYPES.get(type_id, f"unknown_{type_id}")

    # Skip non-clothing types (shape, skin, hair, eyes are bodyparts)
    if type_id in (0, 1, 2, 3):
        category = "bodypart"
    else:
        category = "clothing"

    # Extract parameters
    params = {}
    param_match = re.search(r"^parameters\s+(\d+)\n((?:\d+\s+[\d.]+\n?)*)", text, re.MULTILINE)
    if param_match:
        param_lines = param_match.group(2).strip().split("\n")
        for pline in param_lines:
            parts = pline.strip().split()
            if len(parts) == 2:
                params[parts[0]] = float(parts[1])

    # Extract textures
    texture_refs = []
    tex_match = re.search(r"^textures\s+(\d+)\n((?:\d+\s+[0-9a-f-]+\n?)*)", text, re.MULTILINE)
    if tex_match:
        tex_count = int(tex_match.group(1))
        tex_lines = tex_match.group(2).strip().split("\n")
        for tline in tex_lines:
            parts = tline.strip().split()
            if len(parts) == 2:
                layer_id = int(parts[0])
                tex_uuid = parts[1]
                # Skip null/default UUIDs
                if tex_uuid == "00000000-0000-0000-0000-000000000000":
                    continue
                texture_refs.append(TextureRef(
                    layer_id=layer_id,
                    layer_name=TEXTURE_LAYERS.get(layer_id, f"layer_{layer_id}"),
                    texture_uuid=tex_uuid,
                ))

    # Determine license from region
    license_str = "CC-0 (Linda Kellie / Outworldz)"
    if "virtually_human" in region_name:
        license_str = "Own work (Allen Partridge)"

    return ClothingItem(
        uuid=uuid,
        name=item_name,
        clothing_type=clothing_type,
        type_id=type_id,
        creator_id=creator_id,
        source_region=region_name,
        source_file=str(filepath),
        license=license_str,
        textures=[asdict(t) for t in texture_refs],
        parameters=params,
    )


def find_region_dirs() -> list[tuple[str, Path]]:
    """Find all extracted OAR region directories that match GREEN tier."""
    regions = []
    if not EXTRACTED_OARS_ROOT.exists():
        print(f"ERROR: {EXTRACTED_OARS_ROOT} not found")
        return regions

    for d in sorted(EXTRACTED_OARS_ROOT.iterdir()):
        if not d.is_dir():
            continue
        assets_dir = d / "assets"
        if not assets_dir.exists():
            continue
        # Match against GREEN regions (case-insensitive, flexible matching)
        dir_lower = d.name.lower().replace("-", "_").replace(" ", "_")
        for green in GREEN_REGIONS:
            if green in dir_lower or dir_lower in green:
                regions.append((d.name, d))
                break
    return regions


def convert_jp2_to_png(jp2_path: Path, png_path: Path) -> bool:
    """Convert a JP2/J2C texture to PNG."""
    try:
        import glymur
        jp2_img = glymur.Jp2k(str(jp2_path))
        img_data = jp2_img[:]
        if img_data is None:
            return False

        from PIL import Image
        import numpy as np

        if len(img_data.shape) == 2:
            # Grayscale
            img = Image.fromarray(img_data, mode="L")
        elif img_data.shape[2] == 3:
            img = Image.fromarray(img_data, mode="RGB")
        elif img_data.shape[2] == 4:
            img = Image.fromarray(img_data, mode="RGBA")
        else:
            img = Image.fromarray(img_data)

        png_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(str(png_path), "PNG")
        return True
    except Exception as e:
        print(f"  WARN: JP2 convert failed {jp2_path.name}: {e}")
        return False


def run_extraction(output_dir: Path, regions: Optional[list[str]] = None):
    """Main extraction pipeline."""
    output_dir.mkdir(parents=True, exist_ok=True)

    region_dirs = find_region_dirs()
    if regions:
        region_dirs = [(n, p) for n, p in region_dirs if n.lower() in [r.lower() for r in regions]]

    print(f"\nFound {len(region_dirs)} GREEN-tier regions to process")
    print("=" * 60)

    all_items = []
    stats = {
        "regions_processed": 0,
        "clothing_items": 0,
        "bodypart_items": 0,
        "textures_found": 0,
        "textures_converted": 0,
        "textures_missing": 0,
        "unique_creators": set(),
    }

    for region_name, region_path in region_dirs:
        assets_dir = region_path / "assets"
        print(f"\n--- {region_name} ---")
        stats["regions_processed"] += 1

        # Find all clothing and bodypart files
        clothing_files = sorted(assets_dir.glob("*_clothing.txt"))
        bodypart_files = sorted(assets_dir.glob("*_bodypart.txt"))

        print(f"  Clothing files: {len(clothing_files)}")
        print(f"  Bodypart files: {len(bodypart_files)}")

        for filepath in clothing_files + bodypart_files:
            item = parse_llwearable(filepath, region_name)
            if not item:
                continue

            if item.type_id in (0, 1, 2, 3):
                stats["bodypart_items"] += 1
            else:
                stats["clothing_items"] += 1

            if item.creator_id:
                stats["unique_creators"].add(item.creator_id)

            # Resolve and convert textures
            for tex in item.textures:
                tex_uuid = tex["texture_uuid"]
                jp2_path = assets_dir / f"{tex_uuid}_texture.jp2"
                j2c_path = assets_dir / f"{tex_uuid}_texture.j2c"

                source_path = None
                if jp2_path.exists():
                    source_path = jp2_path
                elif j2c_path.exists():
                    source_path = j2c_path

                if source_path:
                    stats["textures_found"] += 1
                    tex["source_jp2"] = str(source_path)

                    # Output path: textures/{clothing_type}/{item_uuid}_{layer_name}.png
                    png_name = f"{item.uuid}_{tex['layer_name']}.png"
                    png_path = output_dir / "textures" / item.clothing_type / png_name
                    tex["output_png"] = str(png_path)

                    if convert_jp2_to_png(source_path, png_path):
                        tex["converted"] = True
                        stats["textures_converted"] += 1
                else:
                    stats["textures_missing"] += 1

            all_items.append(asdict(item))

    # Write catalog
    catalog_path = output_dir / "catalog.json"
    catalog = {
        "version": "1.0",
        "description": "Extracted clothing textures from OpenSim OAR files",
        "source": "Outworldz (outworldz.com) — Linda Kellie CC-0 collection",
        "extraction_date": __import__("datetime").datetime.now().isoformat(),
        "stats": {
            "regions_processed": stats["regions_processed"],
            "clothing_items": stats["clothing_items"],
            "bodypart_items": stats["bodypart_items"],
            "textures_found": stats["textures_found"],
            "textures_converted": stats["textures_converted"],
            "textures_missing": stats["textures_missing"],
            "unique_creators": len(stats["unique_creators"]),
        },
        "items": all_items,
    }

    with open(catalog_path, "w") as f:
        json.dump(catalog, f, indent=2)

    # Write per-type summary
    type_counts = {}
    for item in all_items:
        ct = item["clothing_type"]
        if ct not in type_counts:
            type_counts[ct] = {"count": 0, "with_textures": 0}
        type_counts[ct]["count"] += 1
        if any(t.get("converted") for t in item["textures"]):
            type_counts[ct]["with_textures"] += 1

    print(f"\n{'='*60}")
    print("EXTRACTION COMPLETE")
    print(f"{'='*60}")
    print(f"Regions processed:  {stats['regions_processed']}")
    print(f"Clothing items:     {stats['clothing_items']}")
    print(f"Bodypart items:     {stats['bodypart_items']}")
    print(f"Textures found:     {stats['textures_found']}")
    print(f"Textures converted: {stats['textures_converted']}")
    print(f"Textures missing:   {stats['textures_missing']}")
    print(f"Unique creators:    {len(stats['unique_creators'])}")
    print(f"\nBy type:")
    for ct, counts in sorted(type_counts.items()):
        print(f"  {ct:20s}: {counts['count']:5d} items, {counts['with_textures']:5d} with textures")
    print(f"\nCatalog: {catalog_path}")
    print(f"Textures: {output_dir / 'textures'}/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract clothing textures from OAR files")
    parser.add_argument("--output", "-o", default="/home/p0qp0q/blackbox/BlackBoxAvatar/extracted-clothing",
                        help="Output directory")
    parser.add_argument("--region", "-r", action="append",
                        help="Specific region(s) to process (default: all GREEN-tier)")
    args = parser.parse_args()

    run_extraction(Path(args.output), args.region)
