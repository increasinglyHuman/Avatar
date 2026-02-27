# Character Manifest Specification

**Version:** 1.0
**Date:** 2026-02-26
**Status:** Draft
**Depends on:** DRESSING_ROOM_SPEC.md, ADR-005, ADR-006

---

## 1. What Is a Character?

**To the player:** "That's my bunnyTail avi." One thing. One name. One thumbnail. Click to wear.

**To the system:** A character is a **manifest** — a JSON recipe that describes how to assemble an avatar from parts. The runtime reads the recipe, fetches the parts, and builds the avatar. The player never sees the parts.

### 1.1 The Manifest Serves Three Roles

| Role | Where It Lives | Purpose |
|------|---------------|---------|
| **Live outfit** | `users.avatar_config` JSONB | What you're wearing right now. Broadcast to other players. The "COF" (Current Outfit Folder). |
| **Saved outfit** | `inventory_folders` (folder_type='outfit') metadata | A snapshot of a complete look. Click to wear. Lives in the outfit gallery. |
| **Saved character** | `user_characters.manifest` JSONB | A full character definition including base body choice. For switching between entirely different avatars. |

All three use the **same JSON format**. An outfit is a manifest. A character is a manifest. The live state is a manifest.

---

## 2. Manifest Format (v1)

```json
{
  "version": 1,

  "base": "nude-feminine",

  "identity": {
    "face": "face-fem-default",
    "hair": "hf-14",
    "gender": "feminine"
  },

  "proportions": {
    "height":        1.0,
    "shoulderWidth": 1.0,
    "armLength":     1.0,
    "legLength":     1.0,
    "neckLength":    1.0,
    "headScale":     1.0
  },

  "materials": {
    "skin":     { "base": "#D4A574", "shade": "#A8845D" },
    "eyes":     "#7B3F00",
    "hair":     "#1A0A2E",
    "lips":     "#CC4455",
    "eyebrows": "#2C1810",
    "nails":    "#CC0033"
  },

  "equipped": {
    "tops":           { "item": "top-23", "tint": "#FF1493" },
    "bottoms":        { "item": "pant-02", "tint": "#1C1C1C" },
    "shoes":          null,
    "socks":          null,
    "undershirt":     null,
    "underpants":     null,
    "onepiece":       null,
    "accessory_neck": null,
    "accessory_arm":  null
  }
}
```

### 2.1 Field Reference

#### `version` (integer, required)
Schema version. Always `1` for Phase 1. Allows future migration.

#### `base` (string, required)
Reference to the canonical nude body GLB. One of:
- `"nude-feminine"` → `bases/nude-feminine.glb`
- `"nude-masculine"` → `bases/nude-masculine.glb`

This is the foundation — the Body_00_SKIN mesh that everything else layers on top of. Must be exported from VRoid Studio with zero clothing to ensure complete, uncut geometry.

#### `identity` (object, required)
What makes this character *this character* — the parts that stay when you strip naked.

| Field | Type | Description |
|-------|------|-------------|
| `face` | string | Face mesh reference. Default VRoid faces: `"face-fem-default"`, `"face-masc-default"`. Future: custom face IDs. |
| `hair` | string \| null | Hair mesh ID from the hair catalog. `null` = bald. |
| `gender` | `"feminine"` \| `"masculine"` | Determines which base body and which clothing fits well. |

#### `proportions` (object, required)
Bone translation overrides that adjust body shape. All values are multipliers where `1.0` = default. Safe range: `0.7` – `1.3`.

| Key | Bones Affected | UI Label |
|-----|---------------|----------|
| `height` | J_Bip_C_Hips Y translation | "Shorter ← → Taller" |
| `shoulderWidth` | J_Bip_L/R_UpperArm X | "Narrower ← → Broader" |
| `armLength` | J_Bip_L/R_LowerArm Y | "Shorter ← → Longer" |
| `legLength` | J_Bip_L/R_LowerLeg Y | "Shorter ← → Longer" |
| `neckLength` | J_Bip_C_Neck Y | "Shorter ← → Longer" |
| `headScale` | J_Bip_C_Head uniform scale | "Smaller ← → Larger" |

These are applied as offsets from the base body's rest pose. The runtime computes:
```
finalBonePosition = restPosition + (proportionValue - 1.0) * range
```

#### `materials` (object, required)
Color overrides applied to VRM MToon materials at runtime.

| Key | Target Material(s) | Format |
|-----|-------------------|--------|
| `skin` | Body_00_SKIN + Face_00_SKIN | `{ "base": hex, "shade": hex }` — MToon litFactor + shadeColorFactor |
| `eyes` | EyeIris_00_EYE | hex string — iris color |
| `hair` | All *_HAIR materials | hex string — hair tint |
| `lips` | FaceMouth region of Face_00_SKIN | hex string — lip tint |
| `eyebrows` | FaceBrow_00_FACE | hex string — eyebrow tint |
| `nails` | Hand UV region of Body_00_SKIN | hex string — nail color |

Skin uses a two-tone system (MToon convention): `base` is the lit color, `shade` is the shadow color. Typically `shade ≈ base × 0.8` but can be set independently for warm/cool shadow control.

#### `equipped` (object, required)
Currently worn clothing items by slot. Each slot is either `null` (empty) or an object:

```json
{ "item": "item-id", "tint": "#hexcolor" }
```

| Slot | Layer | Max | Special Behavior |
|------|-------|-----|-----------------|
| `underpants` | 1 | 1 | — |
| `undershirt` | 2 | 1 | — |
| `socks` | 3 | 1 | — |
| `bottoms` | 4 | 1 | Auto-unequipped when onepiece is worn |
| `tops` | 5 | 1 | Auto-unequipped when onepiece is worn |
| `onepiece` | 6 | 1 | Auto-unequips tops + bottoms |
| `shoes` | 7 | 1 | — |
| `accessory_neck` | 8 | 2 | Stackable: `[{ item, tint }, { item, tint }]` or `null` |
| `accessory_arm` | 9 | 2 | Stackable: `[{ item, tint }, { item, tint }]` or `null` |

Stackable slots use an array instead of a single object.

The `tint` field is optional. When omitted, the clothing's original color is preserved. When set, it multiplies against the garment's base texture.

---

## 3. NEXUS Database Integration

### 3.1 Schema Additions

Two changes to the existing NEXUS schema:

```sql
-- 1. Add avatar_config to users (the live "COF")
ALTER TABLE users
  ADD COLUMN avatar_config JSONB DEFAULT '{}';

COMMENT ON COLUMN users.avatar_config IS
  'Current outfit manifest (Character Manifest v1). '
  'Broadcast to other players. Updated on outfit swap.';

-- 2. Add manifest to user_characters (full character recipe)
ALTER TABLE user_characters
  ADD COLUMN manifest JSONB DEFAULT '{}';

COMMENT ON COLUMN user_characters.manifest IS
  'Character assembly recipe (Character Manifest v1). '
  'Contains base, identity, proportions, materials, equipped items. '
  'Used to reconstruct avatar from parts without re-analyzing GLB.';
```

### 3.2 How Tables Map to Player Concepts

```
┌─────────────────────────────────────────────────────────┐
│ PLAYER CONCEPT          DATABASE                        │
│                                                         │
│ "I'm wearing this"  →  users.avatar_config (JSONB)      │
│                        Live manifest. Updated on every   │
│                        outfit swap. Broadcast to zone.   │
│                                                         │
│ "My bunnyTail avi"  →  user_characters (row)            │
│                        .name = "BunnyTail"               │
│                        .glb_path = baked GLB (fast load) │
│                        .manifest = assembly recipe        │
│                        .thumbnail_path = portrait         │
│                                                         │
│ "My Cyberpunk        →  inventory_folders (row)          │
│  Street outfit"        .folder_type = 'outfit'           │
│                        .name = "Cyberpunk Street"        │
│                        Linked inventory_items = the      │
│                        clothing pieces in this outfit.    │
│                        Manifest stored as folder          │
│                        metadata (properties JSONB on      │
│                        a special notecard item inside).   │
│                                                         │
│ "This jacket"       →  inventory_items (row)             │
│                        .asset_type = 'clothing'          │
│                        .asset_subtype = 'tops'           │
│                        .glb_path = "clothing/tops/..."   │
│                        .is_worn = true/false              │
│                        .properties = { tint, vertCount } │
│                                                         │
│ "My stuff"          →  inventory_folders (tree)           │
│                        Root > Clothing > Tops/Bottoms/..  │
│                        Root > Avatars                     │
│                        Root > Outfits > [outfit folders]  │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Inventory Item Schema for Clothing

Using the existing `inventory_items` table (Migration 010), clothing items use:

```sql
INSERT INTO inventory_items (
  user_id,
  folder_id,        -- points to "Clothing > Tops" folder
  asset_type,       -- 'clothing'
  asset_subtype,    -- 'tops', 'bottoms', 'shoes', 'socks', 'onepiece',
                    -- 'undershirt', 'underpants', 'accessory_neck', 'accessory_arm'
  asset_id,         -- FK to assets table (shared catalog entry)
  glb_path,         -- denormalized: "clothing/tops/top-23.glb"
  name,             -- "Cropped Denim Jacket"
  description,      -- optional flavor text
  creator_id,       -- who made it (system for VRoid defaults)
  is_worn,          -- true if currently equipped
  properties        -- JSONB: { "tint": "#FF1493", "vertCount": 1250,
                    --          "materialName": "N01_023_01_Tops_01_CLOTH",
                    --          "tags": ["casual", "denim"], "layer": 5 }
) VALUES (...);
```

The `asset_subtype` field directly maps to slot names in the manifest's `equipped` object. This is intentional — no translation layer needed.

### 3.4 Outfit Folder Structure

An outfit preset is stored as an `inventory_folder` containing references to the equipped items:

```
inventory_folders:
  id: "outfit-abc-123"
  user_id: "user-xyz"
  parent_id: "outfits-root-folder"
  name: "Cyberpunk Street"
  folder_type: "outfit"

inventory_items (inside this folder):
  - "Outfit Manifest" (asset_type='notecard', properties = { manifest JSON })
  - "Outfit Thumbnail" (asset_type='texture', glb_path = snapshot URL)
```

The manifest notecard inside the folder IS the outfit definition. When the player clicks "Wear" on an outfit:
1. Read the manifest notecard from the folder
2. Parse the JSON
3. Apply as the new `users.avatar_config`
4. Mark appropriate `inventory_items.is_worn` flags
5. Broadcast change to zone

### 3.5 Quick Swap vs Full Dressing Room — Data Flow

**Quick Swap (World shelf, no iframe):**
```
Player clicks outfit thumbnail
  → World reads manifest from outfit folder's notecard
  → World sets users.avatar_config = manifest
  → World runtime re-assembles avatar from manifest
  → NEXUS broadcasts avatar_config change to zone via WebSocket
  → Other players see the change
```

**Full Dressing Room (Glitch iframe):**
```
Player enters dressing room
  → World sends dressing_room_spawn { avatarConfig, inventory }
  → Dressing Room loads avatar from manifest
  → Player experiments (equip/unequip/recolor/adjust)
  → Each change updates a local working manifest
  → "Return to World" sends dressing_room_close { avatarConfig: finalManifest }
  → World applies finalManifest same as Quick Swap
```

---

## 4. The Mesh Stack — Runtime Assembly

### 4.1 Assembly Algorithm

When the World client (or Dressing Room) needs to render an avatar from a manifest:

```typescript
async function assembleAvatar(manifest: CharacterManifest): Promise<AvatarInstance> {
  // 1. Load the nude base body
  const base = await loadGLB(`bases/${manifest.base}.glb`);
  const skeleton = extractSkeleton(base);  // 52 J_Bip bones

  // 2. Apply bone proportion overrides
  applyProportions(skeleton, manifest.proportions);

  // 3. Apply material colors (skin, eyes, etc.)
  applyMaterials(base, manifest.materials);

  // 4. Swap hair mesh
  if (manifest.identity.hair) {
    const hairGLB = await loadGLB(`hair/${manifest.identity.hair}.glb`);
    swapHairMesh(base, hairGLB, skeleton);
  }

  // 5. Equip clothing (layer order: bottom-up)
  const slotOrder = [
    'underpants', 'undershirt', 'socks',
    'bottoms', 'tops', 'onepiece',
    'shoes', 'accessory_neck', 'accessory_arm'
  ];

  for (const slot of slotOrder) {
    const equipped = manifest.equipped[slot];
    if (!equipped) continue;

    const items = Array.isArray(equipped) ? equipped : [equipped];
    for (const { item, tint } of items) {
      const clothGLB = await loadGLB(`clothing/${slot}/${item}.glb`);
      const clothMesh = cloneSkinnedMesh(clothGLB);

      // Rebind to avatar skeleton by J_Bip name matching
      rebindToSkeleton(clothMesh, skeleton);

      // Apply per-item color tint
      if (tint) applyTint(clothMesh, tint);

      // Parent to body mesh group
      base.addChild(clothMesh);
    }
  }

  // 6. Start idle animation + blink controller
  startIdleAnimation(base);
  startBlinkController(base);

  return base;
}
```

### 4.2 Bone Rebinding Algorithm

The critical operation that enables cross-avatar clothing. When a clothing mesh from one VRM is applied to a different avatar's skeleton:

```typescript
function rebindToSkeleton(
  clothMesh: SkinnedMesh,
  targetSkeleton: Skeleton
): void {
  const sourceBones = clothMesh.skeleton.bones;
  const targetBones = targetSkeleton.bones;

  // Build lookup by bone name
  const targetByName = new Map(
    targetBones.map(bone => [bone.name, bone])
  );

  // Map each source bone to the target bone with the same J_Bip name
  const remappedBones = sourceBones.map(sourceBone => {
    const target = targetByName.get(sourceBone.name);
    if (!target) {
      console.warn(`Bone ${sourceBone.name} not found on target — using source`);
      return sourceBone;
    }
    return target;
  });

  // Create new skeleton with remapped bones
  clothMesh.skeleton = new Skeleton(remappedBones);
  clothMesh.skeleton.computeInverseBindMatrices();
}
```

This works because **all VRoid exports use the same 52 J_Bip bone names**. The clothing mesh says "my vertex 47 is 60% influenced by J_Bip_L_UpperArm" — we just point that reference at the target avatar's J_Bip_L_UpperArm bone.

### 4.3 Onepiece Override Logic

When a onepiece is equipped, tops and bottoms are automatically hidden:

```typescript
function equipOnepiece(manifest: CharacterManifest, onepieceId: string): void {
  // Store displaced items (so they can be restored)
  manifest._displaced = {
    tops: manifest.equipped.tops,
    bottoms: manifest.equipped.bottoms
  };

  // Override
  manifest.equipped.onepiece = { item: onepieceId, tint: null };
  manifest.equipped.tops = null;
  manifest.equipped.bottoms = null;
}

function unequipOnepiece(manifest: CharacterManifest): void {
  manifest.equipped.onepiece = null;

  // Restore displaced items
  if (manifest._displaced) {
    manifest.equipped.tops = manifest._displaced.tops;
    manifest.equipped.bottoms = manifest._displaced.bottoms;
    delete manifest._displaced;
  }
}
```

### 4.4 Dual Persistence: Baked GLB + Manifest

For performance, we store **both** forms:

| Format | When Created | Purpose | Size |
|--------|-------------|---------|------|
| **Manifest JSON** | Every outfit save/change | Re-editing, re-assembly, outfit presets | ~1 KB |
| **Baked GLB** | On "Save to World" / character save | Fast loading by other players (no assembly) | 2-8 MB |

**Why both?**
- When Player A sees Player B walk into the room → load Player B's baked GLB (fast, one file)
- When Player B opens their dressing room → load from manifest (can edit, re-assemble from parts)
- Baked GLB is regenerated whenever the manifest changes

```
Dressing Room changes → new manifest
  → save manifest to users.avatar_config
  → bake assembled avatar to GLB
  → upload GLB to users.avatar_url (or S3)
  → broadcast new avatar_url to zone
  → other players fetch baked GLB
```

---

## 5. Custom Mesh Pipeline (Marvelous Designer + External Tools)

### 5.1 The Skeleton Contract

From ADR-006: **any mesh rigged to the 52 J_Bip bones in T-pose will work with our clothing system.** VRoid Studio isn't special — it just happens to produce meshes bound to that skeleton. Any tool that can export a skinned GLB with the right bone names is compatible.

The 52 bones that matter:

```
J_Bip_C_Hips, J_Bip_C_Spine, J_Bip_C_Chest, J_Bip_C_UpperChest
J_Bip_C_Neck, J_Bip_C_Head
J_Bip_L_Shoulder, J_Bip_L_UpperArm, J_Bip_L_LowerArm, J_Bip_L_Hand
J_Bip_R_Shoulder, J_Bip_R_UpperArm, J_Bip_R_LowerArm, J_Bip_R_Hand
J_Bip_L_UpperLeg, J_Bip_L_LowerLeg, J_Bip_L_Foot, J_Bip_L_ToeBase
J_Bip_R_UpperLeg, J_Bip_R_LowerLeg, J_Bip_R_Foot, J_Bip_R_ToeBase
J_Bip_L_Thumb1-3, J_Bip_L_Index1-3, J_Bip_L_Middle1-3
J_Bip_L_Ring1-3, J_Bip_L_Little1-3
J_Bip_R_Thumb1-3, J_Bip_R_Index1-3, J_Bip_R_Middle1-3
J_Bip_R_Ring1-3, J_Bip_R_Little1-3
```

### 5.2 Marvelous Designer → Avatar Pipeline

```
┌──────────────────────┐
│  Marvelous Designer  │
│                      │
│  1. Import VRoid     │
│     nude base as     │ ← Export nude-feminine.vrm → OBJ via Blender
│     avatar/mannequin │    (ensures garment fits VRoid proportions)
│                      │
│  2. Design garment   │
│     (drape, sew,     │
│     simulate)        │
│                      │
│  3. Export as FBX     │
│     (with UV, normals,│
│     no animation)    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│      Blender         │
│                      │
│  4. Import FBX       │
│     garment          │
│                      │
│  5. Import VRoid     │
│     nude base (for   │ ← Same base used as MD mannequin
│     reference)       │
│                      │
│  6. Position garment │
│     on body          │
│                      │
│  7. Add Armature     │
│     modifier →       │
│     target VRoid     │
│     J_Bip skeleton   │
│                      │
│  8. Weight paint     │
│     (or auto-weights │
│     + cleanup)       │
│                      │
│  Bone assignments:   │
│  ┌─────────────────┐ │
│  │ Torso area →    │ │
│  │  J_Bip_C_Spine  │ │
│  │  J_Bip_C_Chest  │ │
│  │  J_Bip_C_Upper..│ │
│  │ Sleeve area →   │ │
│  │  J_Bip_L/R_     │ │
│  │  UpperArm       │ │
│  │  J_Bip_L/R_     │ │
│  │  LowerArm       │ │
│  │ Leg area →      │ │
│  │  J_Bip_L/R_     │ │
│  │  UpperLeg       │ │
│  │  J_Bip_L/R_     │ │
│  │  LowerLeg       │ │
│  └─────────────────┘ │
│                      │
│  9. Apply material   │
│     (PBR or MToon-   │
│     compatible)      │
│                      │
│  10. Export as GLB    │
│      (skinned mesh,  │
│      single material)│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Avatar System       │
│                      │
│  11. Register in     │
│      items.json      │
│      catalog         │
│                      │
│  12. Generate        │
│      thumbnail       │
│      (256×256)       │
│                      │
│  13. Deploy to       │
│      /avatar/assets/ │
│      clothing/{slot}/│
│                      │
│  14. Equip like any  │
│      other clothing  │
│      piece           │
└──────────────────────┘
```

### 5.3 Requirements for Custom Meshes

For a custom mesh (from any tool) to work in our clothing system:

| Requirement | Why | How to Verify |
|-------------|-----|--------------|
| Rigged to J_Bip bones | Rebinding algorithm matches by name | Check bone names in GLB JSON chunk |
| T-pose bind | Matches VRoid rest pose for correct deformation | Visual inspection in Blender |
| Single mesh, single material | Clean equip/unequip, one draw call | Check primitive count = 1 |
| Reasonable vertex count | Performance on mobile/WebGPU | < 3,000 vertices per garment |
| Correct UV layout | Tinting and texturing work | Test with solid color tint |
| No embedded animation | Clothing doesn't animate independently | Check animationClips = 0 in GLB |
| Material named `*_CLOTH` (optional) | Auto-detection of clothing type | Or manually set slot in catalog |

### 5.4 What Won't Transfer from Marvelous Designer

| MD Feature | Status | Why |
|-----------|--------|-----|
| Cloth simulation / drape | Lost | MD simulation doesn't export to runtime. Garment is static geometry. |
| Internal pressure / wind | Lost | Same reason. Physics is bake-time only. |
| Garment layering | Partially preserved | Layer order handled by our slot system, not MD's simulation. |
| Stitching detail | Preserved as geometry | Exported mesh retains stitching geometry if modeled. |
| Fabric texture | Preserved | Exports with UV + material. Works in GLB. |
| Pattern pieces | Lost | MD internal concept. Not relevant at runtime. |

### 5.5 The Experiment

To validate the Marvelous Designer pipeline:

1. **Export the mannequin:**
   ```
   nude-feminine.vrm → Blender → export Body_00_SKIN as OBJ
   ```

2. **Import into Marvelous Designer** as avatar body

3. **Create a simple garment** (t-shirt is ideal — covers torso + arms, clear bone assignments)

4. **Export garment FBX** from MD

5. **In Blender:**
   - Import garment FBX
   - Import VRoid nude base (with skeleton)
   - Parent garment to VRoid armature
   - Auto-weights → manual cleanup
   - Rename vertex groups to match J_Bip convention if needed
   - Export as GLB (selected objects only: garment mesh)

6. **Test in our system:**
   - Does it load as a clothing piece?
   - Does it rebind to the skeleton?
   - Does it deform correctly with animations?
   - Does tinting work?
   - Does it clip badly at default proportions? At ±30%?

If this works, we've proven that **any 3D artist can create clothing for our avatar system** — not just VRoid Studio exports.

### 5.6 Future: Automated Rigging Pipeline

If the manual Blender step becomes a bottleneck, we could build an auto-rigger:

```
Upload OBJ/FBX garment
  → Server loads garment mesh
  → Server loads reference VRoid skeleton
  → For each garment vertex:
      Find nearest body surface point
      Copy that body vertex's bone weights
  → Export as skinned GLB
  → Register in catalog
```

This is the same "heat map" weight transfer technique Blender uses for auto-weights. Deferred to Phase 2+ but architecturally straightforward.

---

## 6. Catalog Format (items.json)

The clothing catalog is a static JSON file that the client loads at startup to know what items exist:

```json
{
  "version": 1,
  "generated": "2026-02-26T12:00:00Z",
  "bases": [
    {
      "id": "nude-feminine",
      "name": "Feminine Base",
      "gender": "feminine",
      "asset": "bases/nude-feminine.glb",
      "thumbnail": "thumbnails/base-fem.jpg"
    },
    {
      "id": "nude-masculine",
      "name": "Masculine Base",
      "gender": "masculine",
      "asset": "bases/nude-masculine.glb",
      "thumbnail": "thumbnails/base-masc.jpg"
    }
  ],
  "hair": [
    {
      "id": "hf-14",
      "name": "Long Wavy",
      "gender": "unisex",
      "asset": "hair/hf-14.glb",
      "thumbnail": "thumbnails/hf-14.jpg",
      "tags": ["long", "wavy", "feminine"]
    }
  ],
  "clothing": [
    {
      "id": "top-23",
      "slot": "tops",
      "name": "Cropped Denim Jacket",
      "gender": "feminine",
      "asset": "clothing/tops/top-23.glb",
      "thumbnail": "thumbnails/top-23.jpg",
      "source": "vroid",
      "tags": ["casual", "denim", "cropped"],
      "metadata": {
        "vertCount": 1250,
        "materialName": "N01_023_01_Tops_01_CLOTH",
        "vroidStyleId": 23
      }
    },
    {
      "id": "top-custom-01",
      "slot": "tops",
      "name": "MD Silk Blouse",
      "gender": "feminine",
      "asset": "clothing/tops/top-custom-01.glb",
      "thumbnail": "thumbnails/top-custom-01.jpg",
      "source": "marvelous-designer",
      "tags": ["formal", "silk", "custom"],
      "metadata": {
        "vertCount": 2100,
        "artist": "Allen Partridge"
      }
    }
  ]
}
```

The `source` field distinguishes VRoid-extracted items from custom-created ones. Both use the same equip pipeline — the source is metadata only.

---

## 7. Proportions → Bone Translation Map

The manifest's `proportions` object uses human-readable keys. The runtime maps these to specific bone operations:

```typescript
const PROPORTION_MAP: Record<string, BoneOperation[]> = {
  height: [
    { bone: 'J_Bip_C_Hips', axis: 'y', range: [-0.3, 0.3] }
  ],
  shoulderWidth: [
    { bone: 'J_Bip_L_UpperArm', axis: 'x', range: [-0.04, 0.04] },
    { bone: 'J_Bip_R_UpperArm', axis: 'x', range: [0.04, -0.04] }  // mirrored
  ],
  armLength: [
    { bone: 'J_Bip_L_LowerArm', axis: 'y', range: [-0.05, 0.05] },
    { bone: 'J_Bip_R_LowerArm', axis: 'y', range: [-0.05, 0.05] }
  ],
  legLength: [
    { bone: 'J_Bip_L_LowerLeg', axis: 'y', range: [-0.06, 0.06] },
    { bone: 'J_Bip_R_LowerLeg', axis: 'y', range: [-0.06, 0.06] }
  ],
  neckLength: [
    { bone: 'J_Bip_C_Neck', axis: 'y', range: [-0.02, 0.02] }
  ],
  headScale: [
    { bone: 'J_Bip_C_Head', type: 'scale', range: [0.8, 1.2] }
  ]
};
```

Each proportion value (0.7–1.3) is normalized to a bone offset within the specified range. The actual range values will need calibration against VRoid base models during implementation.

---

## 8. Relationship to Existing ADRs

| ADR | What It Defines | How This Spec Uses It |
|-----|----------------|----------------------|
| ADR-001 (VRM Post-Import Modification) | Tier 1-3 modification matrix | Manifest `materials` and `proportions` map directly to Tier 1 and Tier 2 operations |
| ADR-005 (Avatar Storage & Identity) | S3 structure, upload flow, Phase 2 wardrobe table | Manifest is the `metadata JSONB` in `avatar_wardrobe`. Dual persistence (GLB + manifest) follows ADR-005's format negotiation. |
| ADR-006 (Unified Skeleton Contract) | 52 J_Bip bones, Mixamo mapping, T-pose | The skeleton contract is what makes cross-avatar clothing and custom meshes possible. Bone rebinding depends on exact J_Bip names. |
| DRESSING_ROOM_SPEC | UI, slots, outfit gallery, three pillars | This spec defines the data format that the Dressing Room reads and writes. The outfit JSON from DRESSING_ROOM_SPEC §6 is this manifest. |

---

## 9. Migration Path

### Phase 1 (Now — Static Catalog)

- Manifest format v1 as defined here
- Static `items.json` catalog served from `/var/www/avatar/assets/`
- All users start with full access to all VRoid-extracted clothing
- `users.avatar_config` added to NEXUS schema
- Outfits stored as inventory folders with manifest notecard

### Phase 2 (Summer 2026 — Wardrobe + Marketplace)

- `avatar_wardrobe` table from ADR-005 uses manifest as `metadata JSONB`
- Clothing items become purchasable (`inventory_items.sale_type`, `sale_price`)
- Custom Marvelous Designer clothing can be submitted by creators
- S3 + CDN for asset delivery
- Manifest format stays v1 (backward compatible)

### Phase 3 (Late 2026 — SuperMesh)

- Manifest v2 adds `bodyMorphs` and `faceMorphs` objects
- `base` field gains new options: `"supermesh-feminine"`, `"supermesh-masculine"`
- Existing v1 manifests load unchanged (no body/face morphs = VRM defaults)
- 72-bone SuperMesh skeleton is a superset of J_Bip — VRoid clothing still works via ADR-006 mapping

---

## 10. Open Questions

1. **Outfit manifest storage** — Is a notecard item inside an outfit folder the right approach? Alternative: dedicated `outfit_manifests` table. The notecard approach reuses existing inventory infrastructure without schema changes.

2. **Baked GLB generation** — When does baking happen? Options:
   - Client-side (Avatar app exports GLB directly) — simple but requires Babylon.js GLB exporter
   - Server-side (NEXUS assembles from manifest + parts) — powerful but complex
   - Hybrid (client bakes, server validates and stores) — likely best

3. **Cross-gender clothing** — Do feminine tops fit on masculine bases? Same J_Bip skeleton but different body proportions. Likely needs separate fem/masc clothing catalogs, or a "fits" tag per item.

4. **Proportion ranges** — The ±30% range is a guess from visual inspection. Needs calibration: at what point does mesh distortion become unacceptable? Needs testing per-proportion.

5. **Material system** — MToon (VRoid's toon shader) vs PBR (standard). Custom MD clothing will likely use PBR materials. Can we mix MToon body + PBR clothing? Babylon.js handles both, but visual consistency may suffer.

6. **Catalog versioning** — When new items are added, how do clients know to re-fetch `items.json`? Options: ETag/If-Modified-Since, version field, WebSocket notification.

---

*This specification defines the data format that connects players, the database, and the runtime 3D assembly pipeline. The manifest is the single source of truth for "what does this avatar look like?" — everything else (baked GLBs, thumbnails, database flags) is derived from it.*
