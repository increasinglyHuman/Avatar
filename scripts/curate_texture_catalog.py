#!/usr/bin/env python3
"""
Curate a starter set of texture clothing items from the extracted OAR catalog.
Picks diverse, well-named items and copies them to public/assets/clothing/.
Generates a TypeScript catalog file for the app.
"""

import json
import shutil
from pathlib import Path

EXTRACTED = Path("/home/p0qp0q/blackbox/BlackBoxAvatar/extracted-clothing")
OUTPUT_DIR = Path("/home/p0qp0q/blackbox/BlackBoxAvatar/public/assets/clothing")
CATALOG_FILE = Path("/home/p0qp0q/blackbox/BlackBoxAvatar/src/avatar/TextureClothingCatalog.ts")

# How many items per clothing type (0 = unlimited)
ITEMS_PER_TYPE = 0

# Map extracted clothing_type → app ClothingSlot
TYPE_TO_SLOT = {
    "shirt": "shirt",
    "pants": "pants",
    "jacket": "jacket",
    "skirt": "skirt",
    "undershirt": "undershirt",
    "underpants": "underwear",
    "socks": "socks",
    "shoes": "shoes",
    "gloves": "gloves",
}

# Map ClothingSlot → which body region the texture targets
SLOT_TO_TARGET = {
    "shirt": "upper",
    "jacket": "upper",
    "undershirt": "upper",
    "pants": "lower",
    "skirt": "lower",
    "underwear": "lower",
    "socks": "lower",
    "shoes": "lower",
    "gloves": "upper",
}


def sanitize_filename(name: str) -> str:
    """Make a safe filename from a clothing item name."""
    safe = name.lower().strip()
    safe = safe.replace(" ", "-").replace("(", "").replace(")", "")
    safe = safe.replace("'", "").replace('"', "").replace(",", "")
    safe = safe.replace("/", "-").replace("\\", "-").replace("&", "and")
    safe = "".join(c for c in safe if c.isalnum() or c in "-_.")
    # Collapse multiple dashes
    while "--" in safe:
        safe = safe.replace("--", "-")
    return safe[:60].strip("-")


SKIP_WORDS = {"beer", "beerman"}

def select_items(items: list, count: int) -> list:
    """Select items: deduplicate by name, skip junk."""
    seen_names = set()
    selected = []

    # Filter: must have converted textures, reasonable name length
    candidates = [
        i for i in items
        if any(t.get("converted") for t in i["textures"])
        and len(i["name"]) > 3
        and len(i["name"]) < 60
        and not i["name"].startswith("LK ")
        and not any(w in i["name"].lower() for w in SKIP_WORDS)
    ]

    # Sort by name for consistent ordering
    candidates.sort(key=lambda x: x["name"].lower())

    for item in candidates:
        name_key = item["name"].lower().strip()
        if name_key not in seen_names:
            seen_names.add(name_key)
            selected.append(item)
            if count > 0 and len(selected) >= count:
                break

    return selected


def main():
    with open(EXTRACTED / "catalog.json") as f:
        catalog = json.load(f)

    print(f"Source catalog: {len(catalog['items'])} items")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_entries = []

    for ext_type, slot in TYPE_TO_SLOT.items():
        items = [i for i in catalog["items"] if i["clothing_type"] == ext_type]
        selected = select_items(items, ITEMS_PER_TYPE)

        slot_dir = OUTPUT_DIR / slot
        slot_dir.mkdir(parents=True, exist_ok=True)

        print(f"\n{ext_type} → {slot}: {len(selected)} selected from {len(items)}")

        for item in selected:
            safe_name = sanitize_filename(item["name"])
            if not safe_name:
                continue

            # Find the first converted texture
            tex = next((t for t in item["textures"] if t.get("converted")), None)
            if not tex:
                continue

            src_png = Path(tex["output_png"])
            if not src_png.exists():
                continue

            dst_png = slot_dir / f"{safe_name}.png"
            shutil.copy2(src_png, dst_png)

            # Relative path from public/ root
            asset_path = f"assets/clothing/{slot}/{safe_name}.png"

            entry = {
                "id": f"tex-{slot}-{safe_name}",
                "name": item["name"].strip(),
                "slot": slot,
                "type": "texture",
                "asset": asset_path,
                "thumbnail": asset_path,
                "target": SLOT_TO_TARGET[slot],
                "alphaRegions": [],
                "compatibleBases": ["both"],
                "tags": [ext_type, "texture-layer", "cc0"],
                "modifiable": True,
                "creator": item.get("creator_id", "unknown"),
                "source_region": item.get("source_region", "unknown"),
                "license": item.get("license", "CC-0"),
            }
            all_entries.append(entry)
            print(f"  + {item['name'][:50]:50s} → {safe_name}.png")

    # Write JSON catalog (loaded at runtime to avoid TS complexity limits)
    json_path = OUTPUT_DIR / "catalog.json"
    with open(json_path, "w") as f:
        json.dump(all_entries, f)

    total_size = sum(f.stat().st_size for f in OUTPUT_DIR.rglob("*.png"))
    print(f"\n{'='*60}")
    print(f"CURATED CATALOG COMPLETE")
    print(f"{'='*60}")
    print(f"Total items: {len(all_entries)}")
    print(f"Total size: {total_size / 1024 / 1024:.1f} MB")
    print(f"Catalog JSON: {json_path}")
    print(f"Assets: {OUTPUT_DIR}/")
    for slot in sorted(set(e['slot'] for e in all_entries)):
        count = sum(1 for e in all_entries if e['slot'] == slot)
        print(f"  {slot}: {count} items")


if __name__ == "__main__":
    main()
