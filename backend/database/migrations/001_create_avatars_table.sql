-- Migration: Add avatars table to bbworlds_nexus
-- Date: 2025-10-13
-- Purpose: Avatar creation history, gallery, and versioning
-- Database: bbworlds_nexus (shared with /world and NEXUS)
-- User: nexus_user

-- ============================================================================
-- AVATARS TABLE
-- ============================================================================
-- Stores user-created avatars with morph data, materials, and GLB exports
-- Integrates with existing `characters` table for current avatar selection

CREATE TABLE IF NOT EXISTS avatars (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User reference (uses existing users.id from bbworlds_nexus)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Avatar identity
    avatar_name VARCHAR(100),
    description TEXT,

    -- Morph data (JSON object with all slider values)
    -- Example: {"age": 0.5, "gender": 0.3, "weight": 0.7, "height": 0.6, "muscle": 0.4, ...}
    morph_data JSONB NOT NULL,

    -- Export data
    glb_url TEXT,                   -- S3 URL: s3://poqpoq-avatars/user_123/avatar_456.glb
    thumbnail_url TEXT,             -- S3 URL: s3://poqpoq-avatars/user_123/avatar_456_thumb.png
    file_size_bytes BIGINT,         -- Track storage usage for quotas

    -- Material/appearance data
    skin_tone VARCHAR(50) DEFAULT 'medium',
    eye_color VARCHAR(50) DEFAULT 'brown',
    material_preset VARCHAR(50),    -- Optional: material preset name

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Flags
    is_public BOOLEAN DEFAULT false,        -- Shared in gallery?
    is_current BOOLEAN DEFAULT false,       -- Currently equipped by user?
    is_featured BOOLEAN DEFAULT false,      -- Featured in gallery?

    -- Usage stats
    export_count INTEGER DEFAULT 0,         -- How many times exported
    view_count INTEGER DEFAULT 0,           -- Gallery views
    clone_count INTEGER DEFAULT 0,          -- Times cloned by others

    -- Versioning (for "save as new version" workflow)
    version INTEGER DEFAULT 1,
    parent_avatar_id UUID REFERENCES avatars(id) ON DELETE SET NULL,

    -- Moderation
    flagged BOOLEAN DEFAULT false,
    moderation_status VARCHAR(20) DEFAULT 'approved'  -- approved, pending, rejected
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User's avatars (most common query)
CREATE INDEX idx_avatars_user_id ON avatars(user_id);

-- Recent avatars (for gallery)
CREATE INDEX idx_avatars_created_at ON avatars(created_at DESC);

-- Public gallery
CREATE INDEX idx_avatars_public ON avatars(is_public) WHERE is_public = true;

-- Current avatar lookup (fast!)
CREATE INDEX idx_avatars_current ON avatars(user_id, is_current) WHERE is_current = true;

-- Featured avatars
CREATE INDEX idx_avatars_featured ON avatars(is_featured) WHERE is_featured = true;

-- Parent-child relationships (versioning)
CREATE INDEX idx_avatars_parent ON avatars(parent_avatar_id) WHERE parent_avatar_id IS NOT NULL;

-- Full-text search on avatar names (optional, for future)
-- CREATE INDEX idx_avatars_name_trgm ON avatars USING gin(avatar_name gin_trgm_ops);

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant all privileges to nexus_user (existing database user)
GRANT ALL PRIVILEGES ON TABLE avatars TO nexus_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nexus_user;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE avatars IS 'User-created avatars with morph data and export history';
COMMENT ON COLUMN avatars.user_id IS 'References users.id - shared UUID across /world, NEXUS, Avatar';
COMMENT ON COLUMN avatars.morph_data IS 'JSON object with all morph slider values for editing/versioning';
COMMENT ON COLUMN avatars.glb_url IS 'S3 URL to exported GLB file - also stored in characters.model_url for current avatar';
COMMENT ON COLUMN avatars.is_current IS 'True if this is the users currently equipped avatar';
COMMENT ON COLUMN avatars.parent_avatar_id IS 'Parent avatar ID for version tracking (save as new version)';

-- ============================================================================
-- INTEGRATION NOTES
-- ============================================================================

-- When user creates/exports avatar:
-- 1. INSERT INTO avatars (user_id, morph_data, glb_url, is_current) VALUES (...) RETURNING id;
-- 2. INSERT INTO characters (user_id, model_url, customization_data, is_primary) VALUES (...)
--    ON CONFLICT (user_id) WHERE is_primary = true
--    DO UPDATE SET model_url = EXCLUDED.model_url;

-- When /world needs current avatar:
-- SELECT model_url FROM characters WHERE user_id = ? AND is_primary = true;

-- When Avatar tool needs to edit existing avatar:
-- SELECT morph_data FROM avatars WHERE id = ?;

-- When user wants gallery of their avatars:
-- SELECT id, avatar_name, thumbnail_url, created_at
-- FROM avatars
-- WHERE user_id = ?
-- ORDER BY created_at DESC;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- DROP INDEX IF EXISTS idx_avatars_user_id;
-- DROP INDEX IF EXISTS idx_avatars_created_at;
-- DROP INDEX IF EXISTS idx_avatars_public;
-- DROP INDEX IF EXISTS idx_avatars_current;
-- DROP INDEX IF EXISTS idx_avatars_featured;
-- DROP INDEX IF EXISTS idx_avatars_parent;
-- DROP TABLE IF EXISTS avatars;
