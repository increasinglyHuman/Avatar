# ADR-005: Avatar Storage & Identity

**Status:** Accepted
**Date:** 2026-02-26
**Authors:** Allen Partridge, Claude Code
**Relates to:** AVATAR_STRATEGY.md Cross-Cutting

---

## Context

Avatars must be stored, retrieved, and associated with user identity across the poqpoq ecosystem. Currently `bbworlds_nexus.users.avatar_url` stores a single URL. As the system matures, users will want multiple avatars (wardrobe), outfit variations, and marketplace purchases.

This ADR defines storage architecture across all three phases, designed to start simple and grow without migration pain.

---

## Phase 1: Single Avatar (Now)

### Current Schema

```sql
-- bbworlds_nexus.users (existing)
avatar_url TEXT  -- single GLB/VRM URL pointing to S3
```

This works for Phase 1. One user, one avatar. Upload replaces the previous one.

### S3 Structure

```
s3://poqpoq-avatars/
├── avatars/
│   ├── {userId}.glb           -- runtime format (what World loads)
│   ├── {userId}.vrm           -- source format (for re-editing in Avatar app)
│   ├── default-fem-01.glb     -- prebuilt feminine variant 1
│   ├── default-fem-02.glb     -- prebuilt feminine variant 2
│   ├── default-masc-01.glb    -- prebuilt masculine variant 1
│   ├── default-masc-02.glb    -- prebuilt masculine variant 2
│   └── ...                    -- curated prebuilt collection
├── hair/
│   ├── fem-short-01.glb       -- extractable hair meshes
│   ├── fem-long-01.glb
│   ├── masc-short-01.glb
│   └── ...
├── clothing/
│   ├── tops-tshirt-01.glb     -- extractable clothing primitives
│   ├── bottoms-jeans-01.glb
│   └── ...
└── thumbnails/
    ├── {userId}.webp           -- avatar portrait for UI
    └── default-*.webp          -- prebuilt thumbnails
```

### Upload Flow

```
Avatar App → POST /nexus/avatars/upload (multipart/form-data)
  ├── file: avatar.glb (runtime)
  ├── source: avatar.vrm (optional, for re-editing)
  └── thumbnail: portrait.webp (generated client-side)

Server:
  1. Validate file size (<50MB GLB, <100MB VRM)
  2. Upload to S3: avatars/{userId}.glb
  3. Upload source if provided: avatars/{userId}.vrm
  4. Upload thumbnail: thumbnails/{userId}.webp
  5. UPDATE users SET avatar_url = s3_url WHERE id = userId
  6. Return { avatar_url, thumbnail_url }
```

### Format Negotiation

- **VRM** is the source/editing format — Avatar app works with VRM
- **GLB** is the runtime format — World loads GLB
- Avatar app exports both: VRM (for re-editing) and GLB (for World)
- The `avatar_url` field always points to GLB (what World consumes)
- A parallel `avatar_source_url` field (or S3 naming convention) tracks the VRM

---

## Phase 2: Wardrobe (Summer 2026)

### New Schema

```sql
-- New table: avatar_wardrobe
CREATE TABLE avatar_wardrobe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL DEFAULT 'My Avatar',
  avatar_type VARCHAR(20) NOT NULL DEFAULT 'vrm',  -- 'vrm', 'ai_mesh', 'supermesh'
  glb_url TEXT NOT NULL,
  source_url TEXT,                -- VRM source for re-editing (nullable)
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',    -- type-specific data (bone transforms, material overrides)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wardrobe_user ON avatar_wardrobe(user_id);
CREATE INDEX idx_wardrobe_active ON avatar_wardrobe(user_id, is_active) WHERE is_active;

-- Maintain backward compatibility:
-- users.avatar_url still points to the active avatar's GLB
-- Application logic keeps them in sync
```

### S3 Structure (expanded)

```
s3://poqpoq-avatars/
├── avatars/
│   ├── {userId}/
│   │   ├── {avatarId}.glb      -- each wardrobe entry gets its own GLB
│   │   ├── {avatarId}.vrm      -- source format
│   │   └── {avatarId}.webp     -- thumbnail
│   └── prebuilts/              -- shared prebuilt collection
├── clothing/                    -- shared clothing primitive library
├── hair/                        -- shared hair mesh library
└── modifications/
    └── {userId}/
        └── {avatarId}-mods.json -- saved material overrides, bone transforms
```

### Wardrobe API

```
GET    /nexus/avatars/wardrobe              -- list user's avatars
POST   /nexus/avatars/wardrobe              -- add new avatar to wardrobe
PUT    /nexus/avatars/wardrobe/{id}         -- update avatar
DELETE /nexus/avatars/wardrobe/{id}         -- remove from wardrobe
PUT    /nexus/avatars/wardrobe/{id}/activate -- set as active avatar
```

### metadata JSONB Examples

```jsonc
// VRM avatar with modifications
{
  "base": "prebuilt-fem-03",
  "boneTransforms": {
    "J_Bip_C_Hips": { "y": 1.05 },
    "J_Bip_L_UpperArm": { "x": 0.15 }
  },
  "materials": {
    "Body_00_SKIN": { "tint": "#d4a574" },
    "EyeIris_00_EYE": { "tint": "#3a7d4e" }
  },
  "hair": "fem-long-03",
  "clothing": ["tops-hoodie-02", "bottoms-jeans-01", "shoes-sneaker-01"]
}

// AI mesh avatar
{
  "source": "meshy3d",
  "retargetedFrom": "original-mesh-id",
  "materialOverrides": { "roughness": 0.65, "tint": "#ffffff" }
}

// SuperMesh avatar (Phase 3)
{
  "base": "feminine",
  "bodyMorphs": { "muscularity": 0.3, "chest_size": 0.5 },
  "faceMorphs": { "jaw_width": -0.1, "lip_fullness": 0.4 },
  "skin": { "tone": "#c4956a", "freckles": 0.3 },
  "clothing": ["tops-jacket-formal-01", "bottoms-skirt-pleated-02"],
  "attachments": ["earring-hoop-gold", "necklace-pendant-01"]
}
```

---

## Phase 3: Marketplace Integration (Late 2026)

```sql
CREATE TABLE avatar_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  item_type VARCHAR(30) NOT NULL,  -- 'clothing', 'hair', 'attachment', 'skin_preset'
  item_id VARCHAR(100) NOT NULL,
  glb_url TEXT NOT NULL,
  thumbnail_url TEXT,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  source VARCHAR(30) DEFAULT 'default',  -- 'default', 'purchased', 'crafted', 'gifted'
  UNIQUE(user_id, item_id)
);
```

---

## Cost Model

| Item | Size | Per User | 1,000 Users | 10,000 Users |
|------|------|----------|-------------|-------------|
| GLB (runtime) | 2-8 MB | ~5 MB | 5 GB | 50 GB |
| VRM (source) | 5-15 MB | ~10 MB | 10 GB | 100 GB |
| Thumbnail | 20-50 KB | ~35 KB | 35 MB | 350 MB |
| Wardrobe (5 avg) | x5 | ~75 MB | 75 GB | 750 GB |

At 10,000 users with wardrobe: ~900 GB = ~$21/month S3 standard. CDN for prebuilts adds ~$5-15/month depending on traffic.

---

## Security

- S3 objects are NOT publicly readable by default
- Signed URLs generated by NEXUS API for avatar access (time-limited)
- Prebuilt avatars are public (CDN-served)
- File size validation server-side (reject >50MB GLB, >100MB VRM)
- Content-type validation (must be valid GLB binary header)
- No executable content in avatar files

---

## References

- NEXUS user management: `World/src/auth/AuthenticationManager.ts`
- Avatar upload endpoint: `POST /nexus/avatars/upload` (to be implemented)
- Database schema: `WORLD_PROJECT_CONTEXT.md` (users table)
- Marketplace types: `Marketplace/src/types/marketplace.ts`

---

_Last Updated: 2026-02-26_
