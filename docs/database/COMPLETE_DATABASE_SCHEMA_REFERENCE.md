# Complete Database Schema Reference
## poqpoq / BBWorlds System
**Version:** 2.0
**Last Updated:** October 9, 2025
**Status:** Production Deployed
**Purpose:** Single source of truth for ALL database tables across the entire poqpoq/BBWorlds ecosystem

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Database Overview](#database-overview)
3. [bbworlds_nexus Database](#bbworlds_nexus-database)
4. [voice_ninja Database](#voice_ninja-database)
5. [poqpoq_pg Database](#poqpoq_pg-database)
6. [Quick Reference Tables](#quick-reference-tables)
7. [Migration History](#migration-history)
8. [ER Diagrams](#er-diagrams)

---

## Executive Summary

### Database Count Summary
| Database | Tables | Purpose | Status |
|----------|--------|---------|--------|
| **bbworlds_nexus** | 43 | Game state, quests, economy, deities | ✅ Production |
| **voice_ninja** | 9 | AI memory, embeddings, relationships | ✅ Production |
| **poqpoq_pg** | ~15 | Authentication, payments (external) | ✅ Production |
| **TOTAL** | **67+** | Complete ecosystem | ✅ Operational |

### Column Count Summary
- **Total Columns**: 850+ across all databases
- **JSONB Columns**: 75+ (hybrid architecture)
- **Vector Columns**: 3 (pgvector for AI embeddings)
- **Indexes**: 150+ for performance
- **Materialized Views**: 3 (leaderboards)

### Data Type Summary
- **UUID**: Primary keys, foreign keys (distributed system friendly)
- **JSONB**: Flexible metadata, configurations, quest data
- **VECTOR**: pgvector for semantic memory search (768D, 384D)
- **TIMESTAMP**: All timestamps use `TIMESTAMP WITH TIME ZONE`
- **TEXT[]**: Array columns for tags, participants, lists

---

## Database Overview

### Architecture Philosophy
**Hybrid Relational + JSONB Design**

**Why This Approach?**
- **Structured columns** for critical queryable data (IDs, timestamps, types)
- **JSONB columns** for evolving features (metadata, configurations, quest state)
- **Best of both worlds**: Type safety + flexibility without constant migrations

**Example: Quest System**
```sql
CREATE TABLE quests (
  id UUID PRIMARY KEY,              -- Structured (always needed)
  title TEXT NOT NULL,              -- Structured (searchable)
  challenge_type VARCHAR(50),       -- Structured (indexed)
  quest_data JSONB NOT NULL         -- Flexible (zero-migration extensibility)
);

-- GIN index makes JSONB fast
CREATE INDEX idx_quests_data ON quests USING GIN (quest_data);
```

**Performance Characteristics:**
- **JSONB queries**: <5ms with GIN indexes (100x faster than sequential scan)
- **Vector similarity**: <50ms for 100k memories (FAISS + pgvector)
- **Leaderboards**: <2ms (materialized views, refreshed every 5 min)
- **Position updates**: <10ms (real-time zones, indexed)

---

## bbworlds_nexus Database

**Database Name:** `bbworlds_nexus`
**Owner:** `nexus_user`
**Password:** `nexus_secure_2025`
**Port:** 5432
**Server:** poqpoq.com (localhost)
**Purpose:** Game state, multi-user, quests, economy, akashic progression, deity bonding
**Status:** ✅ Production Deployed (October 2025)
**Tables:** 46 (43 + 3 new from Migration 006)
**Migrations Applied:** 006 (001-006 complete as of Oct 10, 2025)

### Database Connection String
```
postgresql://nexus_user:nexus_secure_2025@localhost:5432/bbworlds_nexus
```

---

### Core User System (4 Tables)

#### 1. `users` - User Accounts & Dual Progression
**Purpose:** Core user identity, profile, akashic progression, combat level, attributes
**Created By:** Base schema + Migration 004 + Migration 005 + Migration 006
**Row Estimate:** 1,000 - 100,000 users
**NEW (Migration 006):** combat_level, combat_xp, akashic_rank, attributes, resource_type

**Schema:**
```sql
CREATE TABLE users (
    -- Primary Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,  -- Optional for tier 1 auth
    created_at TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),

    -- Account Type
    is_premium BOOLEAN DEFAULT FALSE,
    subscription_type VARCHAR(20) DEFAULT 'free',
    subscription_expires_at TIMESTAMP,

    -- Akashic Progression (Migration 004)
    akashic_resonance INTEGER DEFAULT 0,     -- Primary currency
    akashic_wisdom INTEGER DEFAULT 0,        -- Learning, knowledge
    akashic_creativity INTEGER DEFAULT 0,    -- Building, art, donations
    akashic_connection INTEGER DEFAULT 0,    -- Helping others, social
    akashic_rank INTEGER DEFAULT 1,          -- Overall rank (1-100)
    akashic_rank_title VARCHAR(50) DEFAULT 'Newcomer',

    -- Three Strengths (Non-Combat)
    strength_discovery INTEGER DEFAULT 0,      -- Finding secrets (0-100)
    strength_interpretation INTEGER DEFAULT 0, -- Understanding lore (0-100)
    strength_influence INTEGER DEFAULT 0,      -- Content impact (0-100)

    -- Activity Tracking
    total_quests_completed INTEGER DEFAULT 0,
    total_objects_donated INTEGER DEFAULT 0,
    total_tokens_collected INTEGER DEFAULT 0,
    passive_resonance_earned INTEGER DEFAULT 0,

    -- 12 Core Attributes (Migration 005)
    -- Physical Axis (Body & Action)
    attr_strength INTEGER DEFAULT 10,
    attr_agility INTEGER DEFAULT 10,
    attr_endurance INTEGER DEFAULT 10,

    -- Mental Axis (Mind & Thought)
    attr_magic INTEGER DEFAULT 10,
    attr_wisdom INTEGER DEFAULT 10,
    attr_cunning INTEGER DEFAULT 10,

    -- Social Axis (Spirit & Connection)
    attr_leadership INTEGER DEFAULT 10,
    attr_faith INTEGER DEFAULT 10,
    attr_charisma INTEGER DEFAULT 10,

    -- Creative Axis (Soul & Making)
    attr_creativity INTEGER DEFAULT 10,
    attr_artistry INTEGER DEFAULT 10,
    attr_innovation INTEGER DEFAULT 10,

    -- Easter Eggs
    bob_unlocked BOOLEAN DEFAULT FALSE,
    thoth_unlocked BOOLEAN DEFAULT FALSE,
    akashic_tablets_collected INTEGER[] DEFAULT '{}',

    -- Timestamps
    akashic_last_updated TIMESTAMP DEFAULT NOW(),
    last_rank_up TIMESTAMP,

    -- Flexible metadata
    metadata JSONB DEFAULT '{}'
);
```

**Indexes:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_akashic_resonance ON users(akashic_resonance DESC);
CREATE INDEX idx_users_akashic_rank ON users(akashic_rank DESC, akashic_resonance DESC);
CREATE INDEX idx_users_strength_discovery ON users(strength_discovery DESC);
CREATE INDEX idx_users_strength_interpretation ON users(strength_interpretation DESC);
CREATE INDEX idx_users_strength_influence ON users(strength_influence DESC);
```

**Triggers:**
- `trigger_update_akashic_rank`: Auto-calculates rank based on resonance (7 tiers)
- `trigger_update_blessing_amplification`: Updates deity blessing amplification when faith changes

**Services Using This Table:**
- NEXUS Server (port 3020)
- Cognition API (akashic queries)
- Bob GPT (user context)

**Metadata JSONB Structure:**
```json
{
  "display_name": "AllenTheBuilder",
  "avatar_glb": "/models/custom-avatar.glb",
  "preferences": {
    "ui_theme": "dark",
    "audio_volume": 0.8,
    "notification_preferences": ["quest_complete", "trade_offers"]
  },
  "stats": {
    "total_playtime_minutes": 1440,
    "quests_completed": 27,
    "buildings_placed": 156
  }
}
```

---

#### 2. `user_states` - Real-Time Position & Movement
**Purpose:** Track user position, velocity, rotation for NEXUS broadcasting
**Created By:** Base schema
**Row Estimate:** 100-500 concurrent users (ephemeral data)

**Schema:**
```sql
CREATE TABLE user_states (
    user_id UUID REFERENCES users(id) PRIMARY KEY,

    -- Position data (JSONB for future extensibility)
    position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "z": 0}',
    velocity JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}',
    rotation JSONB DEFAULT '{"x": 0, "y": 0, "z": 0, "w": 1}',

    -- Spatial zone (9-zone grid system)
    zone VARCHAR(20) DEFAULT 'center',

    -- Instance tracking
    instance_id UUID,

    -- Activity state (affects update frequency)
    activity_state VARCHAR(20) DEFAULT 'idle',
    -- Values: 'idle' (10s updates), 'moving' (5s), 'interacting' (2s)

    -- Timestamps
    last_update TIMESTAMP DEFAULT NOW()
);
```

**Position JSONB Structure:**
```json
{
  "x": -12.5,
  "y": 1.8,
  "z": 45.2,
  "terrain_altitude": 1.5,      // Future: adaptive terrain
  "relative_to": "building_123" // Future: moving platforms
}
```

**Zone Values:**
- `north_west`, `north`, `north_east`
- `west`, `center`, `east`
- `south_west`, `south`, `south_east`

**Indexes:**
```sql
CREATE INDEX idx_user_states_zone ON user_states(zone);
CREATE INDEX idx_user_states_instance ON user_states(instance_id);
```

**Performance Notes:**
- Position updates: <10ms target latency
- Zone-based containment for autonomous agents
- Real-time position enables deity flight path calculations

---

#### 3. `user_balances` - Economy & Token System
**Purpose:** Track virtual currency, daily streaks, economic activity
**Created By:** Base schema
**Row Estimate:** 1:1 with users table

**Schema:**
```sql
CREATE TABLE user_balances (
    user_id UUID REFERENCES users(id) PRIMARY KEY,

    -- Currency
    tokens INTEGER DEFAULT 100 CHECK (tokens >= 0),
    premium_tokens INTEGER DEFAULT 0 CHECK (premium_tokens >= 0),

    -- Daily rewards
    daily_streak INTEGER DEFAULT 0,
    last_daily_claim DATE,

    -- Lifetime stats
    total_earned INTEGER DEFAULT 100,
    total_spent INTEGER DEFAULT 0,

    -- Timestamps
    last_updated TIMESTAMP DEFAULT NOW()
);
```

**Token Types:**
- **tokens**: Earned through quests, daily login, player trades
- **premium_tokens**: Purchased with real money (via poqpoq Payment Gateway)

**Automatic Creation:**
```sql
-- Trigger creates balance record when user registers
CREATE TRIGGER trigger_create_user_balance
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_balance();
```

**Services Using This Table:**
- NEXUS Server (economy transactions)
- Quest system (reward distribution)
- Marketplace (purchasing)

---

#### 4. `active_sessions` - Connection Tracking & Monitoring
**Purpose:** Track active Socket.IO connections for debugging and monitoring
**Created By:** Base schema
**Row Estimate:** 100-500 concurrent sessions

**Schema:**
```sql
CREATE TABLE active_sessions (
    session_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    socket_id TEXT,
    instance_id UUID REFERENCES instances(id),
    zone VARCHAR(20),

    -- Connection timestamps
    connected_at TIMESTAMP DEFAULT NOW(),
    last_heartbeat TIMESTAMP DEFAULT NOW(),

    -- Client diagnostics
    client_info JSONB DEFAULT '{}'
);
```

**Client Info JSONB Structure:**
```json
{
  "browser": "Chrome 118",
  "os": "Linux",
  "webgpu_available": true,
  "viewport": "1920x1080",
  "connection_quality": "excellent",
  "latency_ms": 45
}
```

**Indexes:**
```sql
CREATE INDEX idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX idx_active_sessions_instance ON active_sessions(instance_id);
```

---

### Instance System (2 Tables)

#### 5. `instances` - Virtual Spaces & Worlds
**Purpose:** Define virtual spaces where users gather (personal, communal, quest holodecks)
**Created By:** Base schema + Migration 003
**Row Estimate:** 10,000 - 50,000 instances

**Schema:**
```sql
CREATE TABLE instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Type classification
    type VARCHAR(20) NOT NULL CHECK (type IN ('personal', 'communal')),
    instance_subtype VARCHAR(20),  -- Migration 003: 'quest_holodeck'

    -- Ownership
    owner_id UUID REFERENCES users(id),

    -- Basic info
    name TEXT NOT NULL,
    description TEXT,

    -- Access control
    max_visitors INTEGER DEFAULT 10,
    is_public BOOLEAN DEFAULT TRUE,

    -- Quest integration
    quest_id UUID,  -- Migration 003: Links to quests table

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),

    -- Flexible configuration
    metadata JSONB DEFAULT '{}'
);
```

**Metadata JSONB Structure (Instance Configuration):**
```json
{
  "schema_version": 1,
  "environment": {
    "sky_preset": "sunset",
    "time_of_day": "18:30",
    "weather": "clear",
    "lighting_mood": "warm",
    "last_changed_by": "deity_freya",
    "last_changed_at": 1727840500000
  },
  "permissions": {
    "default_can_change_environment": false,
    "require_vote_for_changes": false,
    "admin_user_ids": ["user-uuid-1", "user-uuid-2"]
  },
  "custom_properties": {
    "theme": "marketplace",
    "music_playlist": "ambient_trading",
    "featured_vendor_ids": ["vendor_1", "vendor_2"]
  }
}
```

**Indexes:**
```sql
CREATE INDEX idx_instances_type ON instances(type);
CREATE INDEX idx_instances_owner ON instances(owner_id);
CREATE INDEX idx_instances_public ON instances(is_public);
```

---

#### 6. `instance_visitors` - Access Control & Permissions
**Purpose:** Track who's in which instance and their permissions
**Created By:** Base schema
**Row Estimate:** 1,000 - 10,000 concurrent visits

**Schema:**
```sql
CREATE TABLE instance_visitors (
    instance_id UUID REFERENCES instances(id),
    user_id UUID REFERENCES users(id),

    -- Access timestamp
    joined_at TIMESTAMP DEFAULT NOW(),

    -- Granular permissions
    permissions JSONB DEFAULT '{"can_build": false, "can_trade": true}',

    PRIMARY KEY (instance_id, user_id)
);
```

**Permissions JSONB Structure:**
```json
{
  "can_build": true,              // Place buildings
  "can_change_environment": true, // Sky, lighting, weather
  "can_trade": true,              // Initiate trades
  "can_invite": true,             // Bring other users
  "can_modify_buildings": true,   // Edit existing buildings
  "can_spawn_items": false,       // Create items (admin-only)
  "custom_permissions": {
    "can_access_vault": true,     // Custom per-instance
    "vendor_booth_id": "booth_5"
  }
}
```

**Indexes:**
```sql
CREATE INDEX idx_instance_visitors_user ON instance_visitors(user_id);
```

---

### Quest System (8 Tables)

#### 7. `quests` - Quest Definitions & Templates
**Purpose:** Define reusable quest templates (isekai adventures, microgames, educational challenges)
**Created By:** Migration 003
**Row Estimate:** 1,000 - 10,000 quests

**Schema:**
```sql
CREATE TABLE quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic metadata
    title TEXT NOT NULL,
    description TEXT,  -- Markdown supported
    creator_id UUID REFERENCES users(id),
    creator_type VARCHAR(20) DEFAULT 'user',  -- 'user', 'deity', 'system'

    -- Challenge classification
    challenge_type VARCHAR(50) NOT NULL,
    -- Values: 'isekai_adventure', 'microgame', 'escape_room', 'educational'
    category VARCHAR(50),  -- 'bejeweled', 'coloring', 'logic_puzzle', 'trivia'
    tags TEXT[] DEFAULT '{}',

    -- Core quest data (JSONB for zero-migration extensibility!)
    quest_data JSONB NOT NULL,

    -- Difficulty & Duration
    difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
    complexity_level VARCHAR(20),  -- 'casual', 'moderate', 'complex', 'expert'
    estimated_duration_minutes INTEGER,
    time_limit_seconds INTEGER,  -- NULL = untimed

    -- Participation
    min_participants INTEGER DEFAULT 1,
    max_participants INTEGER DEFAULT 1,
    supports_coop BOOLEAN DEFAULT FALSE,

    -- Rewards (akashic resources)
    rewards JSONB NOT NULL,

    -- Instance configuration
    requires_instance_type VARCHAR(20),  -- 'any', 'personal', 'holodeck'
    instance_template JSONB,

    -- Versioning
    schema_version VARCHAR(10) DEFAULT '1.0',
    quest_version INTEGER DEFAULT 1,

    -- Lifecycle
    status VARCHAR(20) DEFAULT 'active',
    -- Values: 'draft', 'active', 'featured', 'archived'
    is_ranked BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,

    -- Media assets
    media_assets JSONB DEFAULT '{}',

    -- Educational metadata
    learning_objectives TEXT[],
    subject_area VARCHAR(50),

    -- Social metrics
    play_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    average_completion_time_minutes INTEGER,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_played TIMESTAMP,
    featured_at TIMESTAMP,

    -- Flexible metadata
    metadata JSONB DEFAULT '{}'
);
```

**Quest Data JSONB Structure:**
```json
{
  "objectives": [
    {
      "id": "obj_1",
      "type": "reach_location",
      "description": "Find the hidden garden",
      "location": {"x": 120, "y": 0, "z": -45},
      "radius": 5,
      "required": true
    },
    {
      "id": "obj_2",
      "type": "collect_items",
      "description": "Gather 5 moon flowers",
      "item_id": "moon_flower",
      "quantity": 5,
      "required": true
    }
  ],
  "rewards": {
    "akashic_resonance": 50,
    "akashic_wisdom": 25,
    "attributes": {"discovery": 5, "wisdom": 3},
    "items": [{"item_id": "special_seed", "quantity": 1}]
  },
  "ai_hints": {
    "difficulty": "medium",
    "themes": ["exploration", "nature"],
    "recommended_for": ["new_players", "casual_players"]
  }
}
```

**Indexes:**
```sql
CREATE INDEX idx_quests_creator ON quests(creator_id);
CREATE INDEX idx_quests_type ON quests(challenge_type, category);
CREATE INDEX idx_quests_tags ON quests USING GIN(tags);
CREATE INDEX idx_quests_status ON quests(status) WHERE status = 'active';
CREATE INDEX idx_quests_difficulty ON quests(difficulty_rating);
CREATE INDEX idx_quests_data ON quests USING GIN(quest_data);
```

**Services Using This Table:**
- Quest creation UI
- Deity-initiated quests (Hermes "prove yourself")
- Educational challenge generator

---

#### 8. `quest_instances` - Active Play Sessions
**Purpose:** Track active quest sessions with multiple users
**Created By:** Migration 003
**Row Estimate:** 100 - 1,000 active sessions

**Schema:**
```sql
CREATE TABLE quest_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_id UUID REFERENCES quests(id),
    instance_id UUID REFERENCES instances(id),

    -- Participants (array of user UUIDs)
    participants UUID[] NOT NULL,
    host_user_id UUID REFERENCES users(id),

    -- Session state (cached in memory, synced every 30s!)
    state JSONB NOT NULL DEFAULT '{"status": "waiting"}',

    -- Timing
    started_at TIMESTAMP,
    paused_at TIMESTAMP,
    resumed_at TIMESTAMP,
    completed_at TIMESTAMP,
    total_pause_duration_seconds INTEGER DEFAULT 0,

    -- Session type
    session_type VARCHAR(20) DEFAULT 'standard',
    -- Values: 'standard', 'ranked', 'practice', 'speedrun'

    -- Optimization (Chapter 9 NEXUS lesson!)
    last_activity TIMESTAMP DEFAULT NOW(),
    last_sync_at TIMESTAMP DEFAULT NOW(),  -- Prevents DB spam
    is_abandoned BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW()
);
```

**State JSONB Structure:**
```json
{
  "status": "in_progress",
  "current_phase": 2,
  "objectives": {
    "obj_1": {
      "status": "completed",
      "completed_by": "user_uuid_1",
      "completed_at": 1727840500000
    },
    "obj_2": {
      "status": "in_progress",
      "progress": 3,
      "target": 5
    },
    "obj_3": {"status": "locked"}
  },
  "team_data": {
    "leader": "user_uuid_1",
    "formation": "scattered",
    "average_level": 5
  },
  "dynamic_events": [
    {"type": "bonus_objective_appeared", "at": 1727840600000}
  ]
}
```

**Performance Notes:**
- **State updated in memory, synced every 30s** (prevents insane DB call volumes)
- Migration 003 adds `last_sync_at` column for tracking

**Indexes:**
```sql
CREATE INDEX idx_quest_instances_quest ON quest_instances(quest_id);
CREATE INDEX idx_quest_instances_participants ON quest_instances USING GIN(participants);
CREATE INDEX idx_quest_instances_host ON quest_instances(host_user_id);
CREATE INDEX idx_quest_instances_active ON quest_instances(started_at, completed_at)
  WHERE completed_at IS NULL;
CREATE INDEX idx_quest_instances_state ON quest_instances USING GIN(state);
```

---

#### 9. `quest_progress` - User-Specific Progress Tracking
**Purpose:** Track individual contributions to group quests
**Created By:** Migration 003
**Row Estimate:** 1,000 - 10,000 progress records

**Schema:**
```sql
CREATE TABLE quest_progress (
    user_id UUID REFERENCES users(id),
    quest_instance_id UUID REFERENCES quest_instances(id),

    -- Game Kit element tracking
    tokens_collected TEXT[] DEFAULT '{}',
    traps_triggered TEXT[] DEFAULT '{}',
    puzzles_solved TEXT[] DEFAULT '{}',
    npcs_interacted TEXT[] DEFAULT '{}',

    -- Scoring
    score INTEGER DEFAULT 0,
    max_possible_score INTEGER,

    -- Performance metrics
    time_taken_seconds INTEGER,
    mistakes_made INTEGER DEFAULT 0,
    hints_used INTEGER DEFAULT 0,
    perfect_completion BOOLEAN DEFAULT FALSE,

    -- Challenge-specific state (JSONB for any game type)
    challenge_specific_data JSONB DEFAULT '{}',

    -- Progression
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    current_checkpoint VARCHAR(50),

    -- Timestamps
    started_at TIMESTAMP DEFAULT NOW(),
    last_update TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,

    PRIMARY KEY (user_id, quest_instance_id)
);
```

**Challenge-Specific Data JSONB Examples:**

**Bejeweled:**
```json
{
  "board_state": [[1,2,3], [4,5,6]],
  "combos_triggered": 23,
  "max_chain": 9,
  "special_gems_activated": 17
}
```

**Quiz:**
```json
{
  "questions_answered": 8,
  "correct_answers": 6,
  "category_breakdown": {"art": 5, "history": 3}
}
```

**Indexes:**
```sql
CREATE INDEX idx_quest_progress_user ON quest_progress(user_id);
CREATE INDEX idx_quest_progress_instance ON quest_progress(quest_instance_id);
CREATE INDEX idx_quest_progress_score ON quest_progress(score DESC);
CREATE INDEX idx_quest_progress_completion ON quest_progress(completion_percentage);
CREATE INDEX idx_quest_progress_data ON quest_progress USING GIN(challenge_specific_data);
```

---

#### 10. `challenge_completions` - Permanent Completion Records
**Purpose:** Permanent record for leaderboards (written ONCE per completion, no spam)
**Created By:** Migration 003
**Row Estimate:** 10,000 - 100,000 completions

**Schema:**
```sql
CREATE TABLE challenge_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_id UUID REFERENCES quests(id),
    user_id UUID REFERENCES users(id),
    quest_instance_id UUID REFERENCES quest_instances(id),

    -- Final results
    completed_at TIMESTAMP DEFAULT NOW(),
    score INTEGER NOT NULL,
    time_taken_seconds INTEGER NOT NULL,

    -- Performance
    perfect_completion BOOLEAN DEFAULT FALSE,
    mistakes_made INTEGER DEFAULT 0,
    hints_used INTEGER DEFAULT 0,

    -- Game-specific final stats
    game_specific_stats JSONB DEFAULT '{}',

    -- Ranking metadata (auto-calculated via triggers)
    rank_at_completion INTEGER,
    is_high_score BOOLEAN DEFAULT FALSE,
    is_personal_best BOOLEAN DEFAULT FALSE,

    -- Attempt tracking
    is_ranked_attempt BOOLEAN DEFAULT TRUE,
    attempt_number INTEGER DEFAULT 1,

    -- Social sharing
    shared_publicly BOOLEAN DEFAULT FALSE,
    screenshot_url TEXT,

    -- Anti-cheat
    completion_verified BOOLEAN DEFAULT FALSE,
    verification_hash TEXT,

    -- Attribute tracking (Migration 005)
    attributes_at_completion JSONB DEFAULT '{}',
    attribute_rewards_awarded JSONB DEFAULT '{}',
    akashic_essence_awarded JSONB DEFAULT '{}',

    UNIQUE(quest_id, user_id, completed_at)
);
```

**Triggers:**
- `trigger_increment_quest_counts`: Updates quest play_count and completion_count
- `trigger_mark_high_scores`: Auto-marks top 10% scores as high_score
- `trigger_auto_refresh_leaderboards`: Refreshes materialized views (rate-limited to 5 min)

**Indexes:**
```sql
CREATE INDEX idx_completions_quest_score
  ON challenge_completions(quest_id, score DESC, time_taken_seconds ASC);
CREATE INDEX idx_completions_user
  ON challenge_completions(user_id, completed_at DESC);
CREATE INDEX idx_completions_highscore
  ON challenge_completions(is_high_score) WHERE is_high_score = TRUE;
CREATE INDEX idx_completions_personal_best
  ON challenge_completions(user_id, quest_id, is_personal_best)
  WHERE is_personal_best = TRUE;
```

---

#### 11. `user_uploaded_media` - User-Generated Content
**Purpose:** Store user-uploaded images, audio, SVG for challenges
**Created By:** Migration 003
**Row Estimate:** 5,000 - 50,000 uploads

**Schema:**
```sql
CREATE TABLE user_uploaded_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- File metadata
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'audio', 'video', 'svg')),
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes <= 5000000),  -- 5MB max
    mime_type VARCHAR(50) NOT NULL,
    original_filename TEXT,

    -- Image-specific
    width INTEGER,
    height INTEGER,
    thumbnail_path TEXT,
    thumbnail_small_path TEXT,

    -- Audio-specific
    duration_seconds INTEGER,

    -- SVG-specific (Allen's fast lookup system - O(1) region access)
    svg_regions_count INTEGER,
    svg_region_mapping JSONB,

    -- Usage tracking
    used_in_quests UUID[],
    usage_context VARCHAR(50),  -- 'quiz_question', 'coloring_base', 'audio_challenge'

    -- Moderation
    content_rating VARCHAR(2) DEFAULT 'PG',
    moderation_status VARCHAR(20) DEFAULT 'pending',
    -- Values: 'pending', 'approved', 'rejected', 'flagged'
    ai_detected_tags TEXT[],
    ai_confidence_scores JSONB,
    human_reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,

    -- Metadata
    upload_metadata JSONB DEFAULT '{}',

    -- Lifecycle
    uploaded_at TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE
);
```

**SVG Region Mapping JSONB:**
```json
{
  "region_1": {
    "svg_path": "path#leaf-01",
    "neighbors": ["region_2", "region_5"],
    "default_color": "#FFFFFF"
  },
  "region_2": {
    "svg_path": "path#tree-trunk",
    "neighbors": ["region_1", "region_3"],
    "default_color": "#8B4513"
  }
}
```

**Indexes:**
```sql
CREATE INDEX idx_media_user ON user_uploaded_media(user_id);
CREATE INDEX idx_media_type ON user_uploaded_media(media_type);
CREATE INDEX idx_media_status ON user_uploaded_media(moderation_status);
CREATE INDEX idx_media_quests ON user_uploaded_media USING GIN(used_in_quests);
```

---

#### 12. `challenge_templates` - Reusable Quest Patterns
**Purpose:** Templates for AI-generated quest variations
**Created By:** Migration 003
**Row Estimate:** 100 - 500 templates

**Schema:**
```sql
CREATE TABLE challenge_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template metadata
    name TEXT NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50) NOT NULL,
    category VARCHAR(50),

    -- Template structure (AI fills this in)
    template_structure JSONB NOT NULL,

    -- User content requirements
    requires_user_uploads BOOLEAN DEFAULT FALSE,
    max_user_uploads INTEGER DEFAULT 0,
    allowed_upload_types TEXT[],

    -- Complexity
    complexity_level VARCHAR(20),  -- 'casual', 'moderate', 'complex', 'expert'
    default_difficulty INTEGER CHECK (default_difficulty BETWEEN 1 AND 5),
    supports_difficulty_scaling BOOLEAN DEFAULT TRUE,

    -- AI generation
    ai_can_generate BOOLEAN DEFAULT FALSE,
    ai_generation_prompt TEXT,

    -- Creator info
    created_by UUID REFERENCES users(id),
    is_official BOOLEAN DEFAULT FALSE,  -- Created by poqpoq team
    is_public BOOLEAN DEFAULT TRUE,

    -- Usage stats
    times_instantiated INTEGER DEFAULT 0,
    average_completion_rate DECIMAL(4,2),
    average_rating DECIMAL(3,2),

    -- Versioning
    template_version VARCHAR(10) DEFAULT '1.0',

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP,

    metadata JSONB DEFAULT '{}'
);
```

**Template Structure JSONB Example:**
```json
{
  "quest_structure": {
    "phases": 3,
    "objectives_per_phase": [2, 3, 1],
    "difficulty_curve": "gradual"
  },
  "variable_slots": {
    "location_1": {"type": "random_zone"},
    "item_collect": {"type": "common_item", "quantity_range": [3, 7]},
    "npc_interaction": {"type": "friendly_npc"}
  },
  "reward_scaling": {
    "base_resonance": 20,
    "difficulty_multiplier": 1.5,
    "time_bonus": true
  }
}
```

**Indexes:**
```sql
CREATE INDEX idx_templates_type ON challenge_templates(challenge_type);
CREATE INDEX idx_templates_complexity ON challenge_templates(complexity_level);
CREATE INDEX idx_templates_official ON challenge_templates(is_official, is_public);
```

---

#### 13. `quest_object_relationships` - Quest-Object Links
**Purpose:** Bidirectional links between quests and objects (donated items, rewards, etc)
**Created By:** Migration 003
**Row Estimate:** 5,000 - 50,000 relationships

**Schema:**
```sql
CREATE TABLE quest_object_relationships (
    quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
    object_id UUID,  -- Can reference assets, buildings, user_uploaded_media
    object_type VARCHAR(20) NOT NULL,
    -- Values: 'asset', 'building', 'media', 'user_item'

    relationship_type VARCHAR(50) NOT NULL,
    -- Values: 'source', 'reward', 'requirement', 'location', 'npc_seed'

    -- Relationship metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW(),

    PRIMARY KEY (quest_id, object_id, relationship_type)
);
```

**Indexes:**
```sql
CREATE INDEX idx_quest_objects_quest ON quest_object_relationships(quest_id);
CREATE INDEX idx_quest_objects_object ON quest_object_relationships(object_type, object_id);
CREATE INDEX idx_quest_objects_relationship ON quest_object_relationships(relationship_type);
```

---

#### 14. `challenge_leaderboards` - Leaderboard Materialized View
**Purpose:** Fast leaderboard queries (<5ms) - refreshed every 5 min to prevent DB spam
**Created By:** Migration 003
**Row Estimate:** Same as challenge_completions (materialized)

**Schema:**
```sql
CREATE MATERIALIZED VIEW challenge_leaderboards AS
SELECT
    c.quest_id,
    c.user_id,
    u.username,
    u.display_name,
    c.score,
    c.time_taken_seconds,
    c.completed_at,
    c.perfect_completion,
    c.game_specific_stats,

    -- Global rank (all time)
    ROW_NUMBER() OVER (
        PARTITION BY c.quest_id
        ORDER BY c.score DESC, c.time_taken_seconds ASC, c.completed_at ASC
    ) as global_rank,

    -- Weekly rank
    ROW_NUMBER() OVER (
        PARTITION BY c.quest_id, DATE_TRUNC('week', c.completed_at)
        ORDER BY c.score DESC, c.time_taken_seconds ASC
    ) as weekly_rank,

    -- Daily rank
    ROW_NUMBER() OVER (
        PARTITION BY c.quest_id, DATE_TRUNC('day', c.completed_at)
        ORDER BY c.score DESC, c.time_taken_seconds ASC
    ) as daily_rank
FROM challenge_completions c
JOIN users u ON c.user_id = u.id
WHERE c.is_ranked_attempt = TRUE
  AND c.completion_verified = TRUE;
```

**Refresh Function:**
```sql
CREATE FUNCTION refresh_challenge_leaderboards()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY challenge_leaderboards;
END;
$$ LANGUAGE plpgsql;
```

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_leaderboard_global ON challenge_leaderboards(quest_id, global_rank);
CREATE INDEX idx_leaderboard_weekly
  ON challenge_leaderboards(quest_id, weekly_rank, DATE_TRUNC('week', completed_at));
CREATE INDEX idx_leaderboard_daily
  ON challenge_leaderboards(quest_id, daily_rank, DATE_TRUNC('day', completed_at));
CREATE INDEX idx_leaderboard_user ON challenge_leaderboards(user_id);
```

---

### Item & Inventory System (4 Tables)

#### 15. `items` - Item Definitions & Catalog
**Purpose:** Define all item types in the game
**Created By:** Base schema
**Row Estimate:** 1,000 - 10,000 items

**Schema:**
```sql
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    -- Values: 'weapon', 'clothing', 'building', 'consumable', 'decoration', 'seed'

    rarity VARCHAR(20) DEFAULT 'common',
    -- Values: 'common', 'uncommon', 'rare', 'epic', 'legendary'

    glb_path TEXT,
    icon_path TEXT,

    -- Economy
    base_value INTEGER DEFAULT 1,
    is_tradeable BOOLEAN DEFAULT TRUE,
    is_consumable BOOLEAN DEFAULT FALSE,
    max_stack_size INTEGER DEFAULT 1,

    -- Item properties (JSONB for flexibility)
    properties JSONB DEFAULT '{}',

    -- Creator
    creator_id UUID REFERENCES users(id),

    created_at TIMESTAMP DEFAULT NOW()
);
```

**Properties JSONB Examples:**

**Building Item:**
```json
{
  "dimensions": {"width": 10, "height": 5, "depth": 8},
  "collision": true,
  "interactions": [
    {"type": "door", "animation": "swing_open"},
    {"type": "storage", "capacity": 50}
  ],
  "energy_cost": 10
}
```

**Seed Item (Future):**
```json
{
  "growth_stages": ["dormant", "sprouting", "growing", "mature"],
  "growth_duration_hours": 24,
  "influence_radius": 20,
  "modifications": {
    "environment": {
      "sky_tint": "blue",
      "lighting_intensity": 0.8
    },
    "physics": {
      "gravity_modifier": 0.8
    }
  }
}
```

**Indexes:**
```sql
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_rarity ON items(rarity);
CREATE INDEX idx_items_tradeable ON items(is_tradeable);
CREATE INDEX idx_items_creator ON items(creator_id);
```

---

#### 16. `item_templates` - Procedural Item Generation
**Purpose:** Templates for AI-generated items
**Created By:** Base schema
**Row Estimate:** 100 - 500 templates

**Schema:**
```sql
CREATE TABLE item_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    template_data JSONB NOT NULL,
    generation_rules JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Template Data JSONB Example (Building):**
```json
{
  "base_model": "modular_house",
  "variable_components": {
    "roof_type": ["flat", "peaked", "dome"],
    "wall_material": ["wood", "stone", "glass"],
    "door_count": {"min": 1, "max": 3},
    "window_count": {"min": 2, "max": 8}
  },
  "size_scaling": {
    "small": {"multiplier": 0.7, "value": 5},
    "medium": {"multiplier": 1.0, "value": 10},
    "large": {"multiplier": 1.5, "value": 20}
  }
}
```

---

#### 17. `inventories` - User Item Ownership
**Purpose:** Track what each user owns
**Created By:** Base schema
**Row Estimate:** 10,000 - 100,000 inventory slots

**Schema:**
```sql
CREATE TABLE inventories (
    user_id UUID REFERENCES users(id),
    item_id UUID REFERENCES items(id),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    custom_properties JSONB DEFAULT '{}',
    acquired_at TIMESTAMP DEFAULT NOW(),
    slot_position INTEGER,

    PRIMARY KEY (user_id, item_id)
);
```

**Custom Properties JSONB:**
```json
{
  "enchantments": ["glow", "durability_boost"],
  "wear_percentage": 85,
  "renamed_to": "Allen's Workshop Hut",
  "placed_in_instance": "instance_uuid",
  "placed_at": {"x": 10, "y": 0, "z": -5},
  "custom_color": "#FF5733"
}
```

**Indexes:**
```sql
CREATE INDEX idx_inventories_user ON inventories(user_id);
```

---

#### 18. `buildings` - Placed Structures in World
**Purpose:** Persist placed buildings in instances
**Created By:** Base schema + Migration 002
**Row Estimate:** 10,000 - 100,000 placed buildings

**Schema:**
```sql
CREATE TABLE buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES instances(id),
    owner_id UUID REFERENCES users(id),
    item_id UUID REFERENCES items(id),

    -- Asset registry link (Migration 002)
    asset_id UUID REFERENCES assets(id),
    placed_by_companion TEXT,  -- 'deity_artemis', 'deity_freya'
    license_snapshot JSONB DEFAULT '{}',

    name TEXT,
    glb_path TEXT NOT NULL,

    -- Position and transform (JSONB for extensibility)
    position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "z": 0}',
    rotation JSONB DEFAULT '{"x": 0, "y": 0, "z": 0, "w": 1}',
    scale JSONB DEFAULT '{"x": 1, "y": 1, "z": 1}',

    is_public BOOLEAN DEFAULT FALSE,
    interactions JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW(),
    last_modified TIMESTAMP DEFAULT NOW(),
    modified_by UUID REFERENCES users(id)
);
```

**Interactions JSONB:**
```json
{
  "door": {
    "type": "toggle",
    "animation": "swing_open",
    "sound": "door_creak",
    "requires_permission": false
  },
  "storage": {
    "type": "inventory",
    "capacity": 50,
    "shared": false,
    "allowed_users": ["owner_uuid"]
  },
  "portal": {
    "type": "teleport",
    "destination_instance": "other_instance_uuid",
    "destination_position": {"x": 0, "y": 0, "z": 0},
    "requires_permission": true
  }
}
```

**License Snapshot JSONB:**
```json
{
  "license": "CC0",
  "source": "polyhaven",
  "original_author": "Poly Haven",
  "owner_name": "poqpoq",
  "snapshot_at": "2025-10-03T12:00:00Z"
}
```

**Indexes:**
```sql
CREATE INDEX idx_buildings_instance ON buildings(instance_id);
CREATE INDEX idx_buildings_owner ON buildings(owner_id);
CREATE INDEX idx_buildings_asset ON buildings(asset_id);
CREATE INDEX idx_buildings_companion ON buildings(placed_by_companion);
```

**Services Using This Table:**
- Building placement system
- Deity object placement (Artemis trees, Zeus temples)
- Legal compliance (license tracking)

---

### Marketplace & Trading (3 Tables)

#### 19. `marketplace_listings` - Player-to-Player Marketplace
**Purpose:** Enable player-to-player item sales
**Created By:** Base schema
**Row Estimate:** 1,000 - 10,000 active listings

**Schema:**
```sql
CREATE TABLE marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES users(id),
    item_id UUID REFERENCES items(id),
    price INTEGER NOT NULL CHECK (price > 0),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),

    status VARCHAR(20) DEFAULT 'active',
    -- Values: 'active', 'sold', 'cancelled', 'expired'

    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    listed_at TIMESTAMP DEFAULT NOW(),
    sold_at TIMESTAMP,
    buyer_id UUID REFERENCES users(id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_marketplace_active ON marketplace_listings(status) WHERE status = 'active';
CREATE INDEX idx_marketplace_seller ON marketplace_listings(seller_id);
CREATE INDEX idx_marketplace_item ON marketplace_listings(item_id);
```

**Common Queries:**
```sql
-- Find active listings for an item
SELECT * FROM marketplace_listings
WHERE item_id = $1 AND status = 'active'
ORDER BY price ASC;

-- User's sales history
SELECT * FROM marketplace_listings
WHERE seller_id = $1
ORDER BY listed_at DESC;
```

---

#### 20. `trade_requests` - Direct Player Trades
**Purpose:** Secure player-to-player item trades
**Created By:** Base schema
**Row Estimate:** 500 - 5,000 pending trades

**Schema:**
```sql
CREATE TABLE trade_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES users(id),
    recipient_id UUID REFERENCES users(id),

    status VARCHAR(20) DEFAULT 'pending',
    -- Values: 'pending', 'accepted', 'declined', 'cancelled', 'completed'

    requester_items JSONB DEFAULT '[]',
    recipient_items JSONB DEFAULT '[]',
    requester_tokens INTEGER DEFAULT 0,
    recipient_tokens INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 hour'),
    completed_at TIMESTAMP
);
```

**Trade Items JSONB:**
```json
{
  "requester_items": [
    {"item_id": "rare_building", "quantity": 1},
    {"item_id": "common_material", "quantity": 50}
  ],
  "recipient_items": [
    {"item_id": "special_seed", "quantity": 3}
  ],
  "requester_tokens": 100,
  "recipient_tokens": 0
}
```

---

#### 21. `transactions` - Economic Audit Trail
**Purpose:** Immutable record of all item/token transfers
**Created By:** Base schema
**Row Estimate:** 100,000 - 1,000,000 transactions

**Schema:**
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user UUID REFERENCES users(id),
    to_user UUID REFERENCES users(id),

    transaction_type VARCHAR(20) NOT NULL,
    -- Values: 'trade', 'purchase', 'gift', 'quest_reward', 'daily_claim', 'admin_grant'

    items_transferred JSONB DEFAULT '[]',
    tokens_transferred INTEGER DEFAULT 0,
    reference_id UUID,  -- Links to trade_requests, marketplace_listings, etc.

    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

**Indexes:**
```sql
CREATE INDEX idx_transactions_users ON transactions(from_user, to_user);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp DESC);
```

---

### AI Companion System (3 Tables)

#### 22. `ai_companions` - Companion Definitions
**Purpose:** Define AI companions and their personalities
**Created By:** Base schema
**Row Estimate:** 1,000 - 10,000 companions

**Schema:**
```sql
CREATE TABLE ai_companions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    personality_prompt TEXT,
    voice_id VARCHAR(50) DEFAULT 'sultry_witch',

    appearance JSONB DEFAULT '{}',
    position JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}',

    behavior_state VARCHAR(30) DEFAULT 'following',
    -- Values: 'following', 'idle', 'exploring', 'talking', 'performing'

    memory_capacity INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_companions_owner ON ai_companions(owner_id);
CREATE INDEX idx_companions_active ON ai_companions(is_active);
```

---

#### 23. `companion_conversations` - Chat History
**Purpose:** Store conversation history for context
**Created By:** Base schema
**Row Estimate:** 10,000 - 100,000 conversations

**Schema:**
```sql
CREATE TABLE companion_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    companion_id UUID REFERENCES ai_companions(id),
    user_id UUID REFERENCES users(id),

    messages JSONB[] DEFAULT '{}',
    context_data JSONB DEFAULT '{}',

    started_at TIMESTAMP DEFAULT NOW(),
    last_message TIMESTAMP DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE
);
```

**Messages JSONB Array:**
```json
[
  {
    "role": "user",
    "content": "Freya, make it sunset",
    "timestamp": 1727840500000
  },
  {
    "role": "assistant",
    "content": "Setting the mood... #setSky:'sunset'",
    "timestamp": 1727840501000,
    "tool_commands": [
      {"tool": "setSky", "args": "sunset"}
    ]
  }
]
```

**Indexes:**
```sql
CREATE INDEX idx_companion_conversations_companion ON companion_conversations(companion_id);
CREATE INDEX idx_companion_conversations_user ON companion_conversations(user_id);
```

---

#### 24. `companion_memories` - Long-Term Memory (Stored in voice_ninja DB)
**Purpose:** Semantic memory search for AI companions
**Database:** voice_ninja (separate database!)
**See:** [voice_ninja Database Section](#voice_ninja-database)

---

### Economy & Token System (1 Table)

#### 25. `token_transactions` - Token Economy Audit
**Purpose:** Track all token earnings and spending
**Created By:** Base schema
**Row Estimate:** 100,000 - 1,000,000 transactions

**Schema:**
```sql
CREATE TABLE token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    amount INTEGER NOT NULL,  -- Can be negative for spending
    transaction_type VARCHAR(50) NOT NULL,
    reference_id UUID,
    description TEXT,
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

**Indexes:**
```sql
CREATE INDEX idx_token_transactions_user ON token_transactions(user_id);
CREATE INDEX idx_token_transactions_type ON token_transactions(transaction_type);
CREATE INDEX idx_token_transactions_timestamp ON token_transactions(timestamp DESC);
```

---

### Networking & Real-Time (1 Table)

#### 26. `chat_messages` - World Chat & Communication
**Purpose:** Store world chat for moderation and history
**Created By:** Base schema
**Row Estimate:** 100,000 - 1,000,000 messages

**Schema:**
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id),
    instance_id UUID REFERENCES instances(id),
    zone VARCHAR(20),

    message_type VARCHAR(20) DEFAULT 'text',
    -- Values: 'text', 'emote', 'system', 'deity_announcement'

    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

**Indexes:**
```sql
CREATE INDEX idx_chat_messages_instance ON chat_messages(instance_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
```

---

### Asset Registry (1 Table - Migration 002)

#### 27. `assets` - 3D Model Catalog with Licensing
**Purpose:** Track every GLB/GLTF model with proper attribution and licensing for legal compliance
**Created By:** Migration 002
**Row Estimate:** 500 - 5,000 assets

**Schema:**
```sql
CREATE TABLE assets (
    -- Primary identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_name TEXT NOT NULL UNIQUE,  -- 'fir_sapling', 'boulder_large'
    category VARCHAR(50) NOT NULL,    -- 'tree', 'rock', 'plant', 'prop', 'building'

    -- File location
    glb_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    file_hash TEXT,  -- SHA-256 for integrity

    -- Licensing (CRITICAL FOR LEGAL COMPLIANCE)
    license VARCHAR(50) NOT NULL,     -- 'CC0', 'CC-BY-4.0', 'proprietary', 'user_owned'
    source VARCHAR(50) NOT NULL,      -- 'polyhaven', 'meshy', 'user_upload', 'commissioned'
    original_author TEXT,
    original_url TEXT,

    -- Ownership
    owner_id UUID REFERENCES users(id),
    owner_name TEXT DEFAULT 'poqpoq',

    -- Display metadata
    display_name TEXT,
    description TEXT,
    tags TEXT[],
    thumbnail_url TEXT,

    -- Technical metadata
    polygon_count INTEGER,
    has_animations BOOLEAN DEFAULT FALSE,
    has_collisions BOOLEAN DEFAULT TRUE,
    default_scale JSONB DEFAULT '{"x": 1, "y": 1, "z": 1}',

    -- Availability
    is_active BOOLEAN DEFAULT TRUE,
    requires_quest BOOLEAN DEFAULT FALSE,
    requires_premium BOOLEAN DEFAULT FALSE,
    min_user_level INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP
);
```

**Seeded Assets (16 from Poly Haven - CC0 Public Domain):**
- **Trees:** 6 varieties (fir_sapling, island_tree_01-03, jacaranda_tree, tree_small_02)
- **Rocks:** 3 varieties (moon_rock_03, namaqualand_boulder_02, namaqualand_boulder_06)
- **Plants:** 5 varieties (grass, moss, shrubs, autumn leaves)
- **Props:** 1 (treasure_chest)

**Indexes:**
```sql
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_name ON assets(asset_name);
CREATE INDEX idx_assets_owner ON assets(owner_id);
CREATE INDEX idx_assets_license ON assets(license);
CREATE INDEX idx_assets_source ON assets(source);
CREATE INDEX idx_assets_tags ON assets USING GIN(tags);
CREATE INDEX idx_assets_active ON assets(is_active) WHERE is_active = TRUE;
```

**Helper Functions:**
```sql
-- Get full asset info including license for in-world display
CREATE FUNCTION get_asset_info(p_asset_id UUID)
RETURNS TABLE(asset_name TEXT, display_name TEXT, license TEXT, attribution TEXT, owner_name TEXT);

-- Validate license compliance before use
CREATE FUNCTION check_asset_license(p_asset_id UUID, p_user_id UUID)
RETURNS TABLE(can_use BOOLEAN, requires_attribution BOOLEAN, attribution_text TEXT);
```

**Triggers:**
```sql
-- Auto-populate license snapshot when building is placed
CREATE TRIGGER trigger_populate_license_snapshot
  BEFORE INSERT ON buildings
  FOR EACH ROW EXECUTE FUNCTION populate_license_snapshot();
```

---

### Akashic Progression System (2 Tables - Migration 004)

#### 28. `akashic_transactions` - Essence Award Audit Trail
**Purpose:** Track all akashic essence awards and sources
**Created By:** Migration 004
**Row Estimate:** 100,000 - 1,000,000 transactions

**Schema:**
```sql
CREATE TABLE akashic_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),

    transaction_type VARCHAR(50) NOT NULL,
    -- Values: 'quest_completion', 'donation', 'token_collection', 'passive_income'

    essence_type VARCHAR(20),  -- 'resonance', 'wisdom', 'creativity', 'connection'
    amount INTEGER NOT NULL,

    source_id UUID,      -- quest_id, challenge_id, etc.
    source_type VARCHAR(50),  -- 'quest', 'challenge', 'donation', 'social'

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_akashic_transactions_user ON akashic_transactions(user_id, created_at DESC);
CREATE INDEX idx_akashic_transactions_type ON akashic_transactions(transaction_type);
```

**Helper Function:**
```sql
CREATE FUNCTION award_akashic_essence(
  p_user_id UUID,
  p_resonance INTEGER DEFAULT 0,
  p_wisdom INTEGER DEFAULT 0,
  p_creativity INTEGER DEFAULT 0,
  p_connection INTEGER DEFAULT 0,
  p_source_type VARCHAR(50) DEFAULT 'manual',
  p_source_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB;
```

---

#### 29. `akashic_leaderboard` - Progression Rankings (VIEW)
**Purpose:** Fast leaderboard queries for akashic progression
**Created By:** Migration 004
**Type:** VIEW (not materialized - real-time)

**Schema:**
```sql
CREATE VIEW akashic_leaderboard AS
SELECT
  u.id,
  u.username,
  u.display_name,
  u.avatar_url,
  u.akashic_rank,
  u.akashic_rank_title,
  u.akashic_resonance,
  u.akashic_wisdom,
  u.akashic_creativity,
  u.akashic_connection,
  u.strength_discovery,
  u.strength_interpretation,
  u.strength_influence,
  u.total_quests_completed,
  u.total_objects_donated,
  RANK() OVER (ORDER BY u.akashic_resonance DESC) as global_rank
FROM users u
WHERE u.akashic_resonance > 0
ORDER BY u.akashic_resonance DESC;
```

---

### Deity & Attribute System (8 Tables - Migration 005)

#### 30. `deities` - Deity Registry (12 Ritual Ring + 2 Hidden)
**Purpose:** 14 deities (12 ritual ring + Bob + Thoth)
**Created By:** Migration 005
**Row Estimate:** 14 deities (seeded data)

**Schema:**
```sql
CREATE TABLE deities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deity_name VARCHAR(50) UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    pantheon VARCHAR(50) NOT NULL,
    gender VARCHAR(20),

    -- Visual design
    primary_color VARCHAR(20),
    color_hex VARCHAR(7),
    position_x FLOAT,
    position_y FLOAT,
    position_z FLOAT,

    -- Unlock system
    min_rank_required INTEGER DEFAULT 1,
    is_hidden BOOLEAN DEFAULT FALSE,
    unlock_method VARCHAR(50),
    unlock_description TEXT,

    -- Attribute affinities
    primary_attribute VARCHAR(20),
    secondary_attribute VARCHAR(20),

    -- Meta
    voice_personality VARCHAR(50),
    personality_archetype VARCHAR(50),
    in_ritual_ring BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,

    lore_description TEXT,
    quote TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);
```

**Seeded Deities:**
- **Ritual Ring (12):** Zeus, Hera, Poseidon, Demeter, Athena, Apollo, Artemis, Ares, Hephaestus, Aphrodite, Hermes, Dionysus
- **Hidden (2):** Bob (companion, requires special unlock), Thoth (Egyptian, collect 13 akashic tablets)

**Indexes:**
```sql
CREATE INDEX idx_deities_pantheon ON deities(pantheon, min_rank_required);
CREATE INDEX idx_deities_rank_unlock ON deities(min_rank_required, in_ritual_ring);
CREATE INDEX idx_deities_hidden ON deities(is_hidden, is_active);
```

---

#### 31. `deity_blessings` - Blessing Configurations (3 per Deity)
**Purpose:** 42 total blessings (14 deities × 3 blessings each)
**Created By:** Migration 005
**Row Estimate:** 42 blessings (seeded data)

**Schema:**
```sql
CREATE TABLE deity_blessings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deity_id UUID NOT NULL REFERENCES deities(id),
    blessing_name VARCHAR(50) NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,

    -- Attribute bonuses
    primary_attribute VARCHAR(20) NOT NULL,
    primary_bonus INTEGER NOT NULL,
    secondary_attribute VARCHAR(20) NOT NULL,
    secondary_bonus INTEGER NOT NULL,

    -- Theme
    theme_archetype VARCHAR(50),
    companion_variant VARCHAR(50),

    UNIQUE(deity_id, blessing_name)
);
```

**Example Blessings (Artemis):**
1. **Hunter's Precision**: +8 Agility, +5 Cunning
2. **Nature's Embrace**: +7 Endurance, +6 Wisdom
3. **Moonlit Grace**: +9 Agility, +4 Faith

**Faith Amplification:**
- 0-20 Faith: 1.0x (no amplification)
- 21-40 Faith: 1.0 - 1.25x (linear)
- 41-60 Faith: 1.25 - 1.5x
- 61-80 Faith: 1.5 - 1.75x
- 81-100 Faith: 1.75 - 2.0x

---

#### 32. `user_deity_bonds` - Active Bonding Relationships
**Purpose:** Track which deity blessing each user has bonded with
**Created By:** Migration 005
**Row Estimate:** 1,000 - 100,000 active bonds

**Schema:**
```sql
CREATE TABLE user_deity_bonds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    deity_id UUID NOT NULL REFERENCES deities(id),
    blessing_id UUID NOT NULL REFERENCES deity_blessings(id),

    bonded_at TIMESTAMP DEFAULT NOW(),
    unbonded_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    -- Faith tracking (for blessing amplification)
    faith_at_bonding INTEGER,
    current_amplification FLOAT DEFAULT 1.0,

    -- Loyalty tracking
    quests_completed_for_deity INTEGER DEFAULT 0,
    offerings_made INTEGER DEFAULT 0,
    days_bonded INTEGER DEFAULT 0
);
```

**Constraint:**
- Only ONE active bond per user (enforced via partial unique index)

**Indexes:**
```sql
CREATE INDEX idx_deity_bonds_user_active ON user_deity_bonds(user_id, is_active);
CREATE INDEX idx_deity_bonds_deity ON user_deity_bonds(deity_id, is_active);
CREATE UNIQUE INDEX idx_deity_bonds_user_deity_unique
  ON user_deity_bonds(user_id, deity_id) WHERE is_active = TRUE;
```

**Triggers:**
```sql
-- Auto-update amplification when faith changes
CREATE TRIGGER trigger_update_blessing_amplification
  AFTER UPDATE OF attr_faith ON users
  FOR EACH ROW EXECUTE FUNCTION update_blessing_amplification();
```

---

#### 33. `attribute_transactions` - Attribute Change Audit Trail
**Purpose:** Track all attribute changes with source tracking
**Created By:** Migration 005
**Row Estimate:** 100,000 - 1,000,000 transactions

**Schema:**
```sql
CREATE TABLE attribute_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    attribute_name VARCHAR(20) NOT NULL,
    amount_change INTEGER NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_attribute_transactions_user ON attribute_transactions(user_id, created_at DESC);
CREATE INDEX idx_attribute_transactions_type ON attribute_transactions(attribute_name, source_type);
```

**Helper Function:**
```sql
CREATE FUNCTION award_attributes(
  p_user_id UUID,
  p_strength INTEGER DEFAULT 0,
  p_agility INTEGER DEFAULT 0,
  p_endurance INTEGER DEFAULT 0,
  p_magic INTEGER DEFAULT 0,
  p_wisdom INTEGER DEFAULT 0,
  p_cunning INTEGER DEFAULT 0,
  p_leadership INTEGER DEFAULT 0,
  p_faith INTEGER DEFAULT 0,
  p_charisma INTEGER DEFAULT 0,
  p_creativity INTEGER DEFAULT 0,
  p_artistry INTEGER DEFAULT 0,
  p_innovation INTEGER DEFAULT 0,
  p_source_type VARCHAR(50) DEFAULT 'manual',
  p_source_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB;
```

---

#### 34. `attribute_leaderboards` - Attribute Rankings (MATERIALIZED VIEW)
**Purpose:** Fast attribute leaderboard queries
**Created By:** Migration 005
**Type:** MATERIALIZED VIEW (refreshed periodically)

**Schema:**
```sql
CREATE MATERIALIZED VIEW attribute_leaderboards AS
SELECT
  u.id,
  u.username,
  u.display_name,
  u.avatar_url,
  u.akashic_rank,

  -- All 12 attributes
  u.attr_strength, u.attr_agility, u.attr_endurance,
  u.attr_magic, u.attr_wisdom, u.attr_cunning,
  u.attr_leadership, u.attr_faith, u.attr_charisma,
  u.attr_creativity, u.attr_artistry, u.attr_innovation,

  -- Ranks per attribute (12 rank columns)
  RANK() OVER (ORDER BY u.attr_strength DESC) as strength_rank,
  RANK() OVER (ORDER BY u.attr_agility DESC) as agility_rank,
  -- ... (10 more rank columns)

  -- Total attribute power
  (u.attr_strength + u.attr_agility + u.attr_endurance +
   u.attr_magic + u.attr_wisdom + u.attr_cunning +
   u.attr_leadership + u.attr_faith + u.attr_charisma +
   u.attr_creativity + u.attr_artistry + u.attr_innovation) as total_attributes,

  RANK() OVER (ORDER BY (...) DESC) as overall_rank
FROM users u
WHERE u.akashic_rank > 0;
```

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_attribute_leaderboards_id ON attribute_leaderboards(id);
```

---

#### 35. `akashic_tablet_discoveries` - Thoth Easter Egg Tracking
**Purpose:** Track discovery of 13 akashic tablets (unlock Thoth)
**Created By:** Migration 005
**Row Estimate:** 100 - 10,000 discoveries

**Schema:**
```sql
CREATE TABLE akashic_tablet_discoveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    tablet_number INTEGER NOT NULL CHECK (tablet_number BETWEEN 1 AND 13),
    tablet_name TEXT,
    lore_text TEXT,
    location_found JSONB,
    discovered_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, tablet_number)
);
```

**Indexes:**
```sql
CREATE INDEX idx_tablet_discoveries_user ON akashic_tablet_discoveries(user_id, tablet_number);
```

---

#### 36. `hidden_deity_discoveries` - Easter Egg Discovery Log
**Purpose:** Track discovery of hidden deities (Bob, Thoth)
**Created By:** Migration 005
**Row Estimate:** 100 - 10,000 discoveries

**Schema:**
```sql
CREATE TABLE hidden_deity_discoveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    deity_name VARCHAR(50) NOT NULL,
    discovered_at TIMESTAMP DEFAULT NOW(),
    discovery_method VARCHAR(50),

    UNIQUE(user_id, deity_name)
);
```

**Indexes:**
```sql
CREATE INDEX idx_hidden_deity_discoveries_user ON hidden_deity_discoveries(user_id, discovered_at DESC);
```

---

### Asset Usage Analytics (1 Table - Migration 002)

#### 37. `asset_usage` - Asset Usage Tracking
**Purpose:** Track asset placement and usage for analytics
**Created By:** Migration 002
**Row Estimate:** 10,000 - 100,000 usage events

**Schema:**
```sql
CREATE TABLE asset_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id),
    used_by UUID REFERENCES users(id),
    instance_id UUID REFERENCES instances(id),
    action VARCHAR(20),  -- 'placed', 'removed', 'viewed'
    timestamp TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_asset_usage_asset ON asset_usage(asset_id);
CREATE INDEX idx_asset_usage_user ON asset_usage(used_by);
```

**View:**
```sql
CREATE VIEW popular_assets AS
SELECT
    a.asset_name,
    a.display_name,
    a.category,
    COUNT(au.id) as usage_count,
    COUNT(DISTINCT au.used_by) as unique_users
FROM assets a
LEFT JOIN asset_usage au ON a.id = au.asset_id
WHERE au.action = 'placed'
GROUP BY a.id, a.asset_name, a.display_name, a.category
ORDER BY usage_count DESC;
```

---

### Enhanced User System (Schema v2.0 - Not Yet Deployed)

The following tables exist in `schema_v2_enhanced.sql` but are NOT yet deployed to production. They are planned for future releases.

#### 38-43. Enhanced User Tables (v2.0 - PLANNED)
- `user_characters` - Character selection and custom uploads
- `user_friends` - Social connections and friend requests
- `user_blocks` - User blocking and ignore system
- `user_contact_cards` - Shareable profiles
- `content_ratings` - Maturity ratings for all content
- `content_reports` - Content moderation and reporting
- `user_auth_tokens` - OAuth tokens and session management
- `adult_verification` - Adult age verification

**Status:** 📅 Planned for Q1 2026

---

### System Metadata (1 Table)

#### 44. `schema_version` - Migration Tracking
**Purpose:** Track database schema changes over time
**Created By:** Base schema + all migrations
**Row Estimate:** 5-20 version records

**Schema:**
```sql
CREATE TABLE schema_version (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT NOW(),
    description TEXT,
    migration_file TEXT
);
```

**Current Records:**
```sql
INSERT INTO schema_version (version, description) VALUES
  ('1.0.0', 'Initial NEXUS v1 database schema'),
  ('001', 'Add environment indexes'),
  ('002', 'Add asset registry'),
  ('003', 'Add quest & challenge system'),
  ('004', 'Add Akashic System (resonance, rank, strengths)'),
  ('005', 'Add 12 Attribute System + Deity Bonding + Easter Eggs');
```

---

## voice_ninja Database

**Database Name:** `voice_ninja`
**Owner:** `voice_ninja_user`
**Password:** `voice_ninja_secure_2025`
**Port:** 5432
**Server:** poqpoq.com (localhost)
**Purpose:** AI memory, embeddings, companion relationships
**Status:** ✅ Production Deployed
**Tables:** 9
**Technology:** pgvector for semantic memory search

### Database Connection String
```
postgresql://voice_ninja_user:voice_ninja_secure_2025@localhost:5432/voice_ninja
```

---

### Memory System Tables

#### 1. `companion_memories` - AI Memory with Vector Embeddings
**Purpose:** Store companion memories with selective compression based on tier and age
**Technology:** pgvector (768D, 384D embeddings)
**Row Estimate:** 10,000 - 1,000,000 memories

**Schema:**
```sql
CREATE TABLE companion_memories (
    -- Primary identifiers
    memory_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    companion_id VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL,  -- References bbworlds_nexus.users

    -- Memory classification
    tier memory_tier_enum NOT NULL,
    -- Values: 'core', 'important', 'background', 'sparse'

    significance_score FLOAT NOT NULL CHECK (significance_score >= 0 AND significance_score <= 1),
    compression_type compression_type_enum NOT NULL DEFAULT 'full',
    -- Values: 'full', 'pca384', 'pq48', 'sparse_only'

    -- Selective embedding storage (only one populated)
    full_embedding vector(768),           -- Core memories (3KB each)
    compressed_embedding vector(384),     -- PCA compressed (1.5KB each)
    quantized_embedding BYTEA,           -- Product Quantized (48 bytes each)

    -- Sparse anchor data (always present)
    conversation_hash VARCHAR(64) NOT NULL,  -- SHA-256 for deduplication
    key_phrases TEXT[] NOT NULL,             -- 3-5 significant phrases
    conversation_snippet TEXT,               -- First 200 chars

    -- Emotional and contextual metadata
    emotional_intensity FLOAT NOT NULL CHECK (emotional_intensity >= 0 AND emotional_intensity <= 1),
    emotional_valence FLOAT NOT NULL CHECK (emotional_valence >= -1 AND emotional_valence <= 1),
    interaction_context JSONB,

    -- Temporal and access data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,

    -- Compression metadata
    original_size INTEGER,
    compressed_size INTEGER,
    compression_ratio FLOAT,
    quality_metric FLOAT,  -- Reconstruction quality (0-1)

    -- Constraints
    CONSTRAINT valid_embedding_storage CHECK (
        (full_embedding IS NOT NULL)::int +
        (compressed_embedding IS NOT NULL)::int +
        (quantized_embedding IS NOT NULL)::int <= 1
    )
);
```

**Memory Tiers:**
- **core**: Never compressed, full 768D embeddings (50 memories max)
- **important**: PCA to 384D after 30 days (200 memories max)
- **background**: Product Quantization to 48 bytes after 7 days (500 memories max)
- **sparse**: Only sparse anchors, no embeddings (unlimited)

**Indexes:**
```sql
-- Vector similarity indexes (primary performance critical)
CREATE INDEX idx_memories_full_embedding_cosine
    ON companion_memories
    USING ivfflat (full_embedding vector_cosine_ops)
    WITH (lists = 100)
    WHERE full_embedding IS NOT NULL;

CREATE INDEX idx_memories_compressed_embedding_cosine
    ON companion_memories
    USING ivfflat (compressed_embedding vector_cosine_ops)
    WITH (lists = 50)
    WHERE compressed_embedding IS NOT NULL;

-- Query indexes
CREATE INDEX idx_memories_companion_tier ON companion_memories(companion_id, tier);
CREATE INDEX idx_memories_significance ON companion_memories(significance_score DESC);
CREATE INDEX idx_memories_user_companion ON companion_memories(user_id, companion_id);
CREATE INDEX idx_memories_conversation_hash ON companion_memories USING hash(conversation_hash);
```

**Performance:**
- **Vector similarity search**: <50ms for 100k memories (FAISS + pgvector)
- **Compression ratio**: 2:1 (PCA), 64:1 (Product Quantization)
- **Storage efficiency**: Core 3KB, Important 1.5KB, Background 48 bytes

---

#### 2. `companion_relationships` - User-Companion Bonding
**Purpose:** Track relationship development and memory system statistics
**Row Estimate:** 1,000 - 100,000 relationships

**Schema:**
```sql
CREATE TABLE companion_relationships (
    relationship_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    companion_id VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL,

    -- Relationship metrics
    stage relationship_stage_enum NOT NULL DEFAULT 'stranger',
    -- Values: 'stranger', 'acquaintance', 'friend', 'close_friend'

    trust_level FLOAT NOT NULL DEFAULT 0.5 CHECK (trust_level >= 0 AND trust_level <= 1),
    quality_score FLOAT NOT NULL DEFAULT 0.5 CHECK (quality_score >= 0 AND quality_score <= 1),
    interaction_count INTEGER DEFAULT 0,

    -- Memory system statistics
    total_memories INTEGER DEFAULT 0,
    core_memories_count INTEGER DEFAULT 0,
    important_memories_count INTEGER DEFAULT 0,
    background_memories_count INTEGER DEFAULT 0,
    sparse_memories_count INTEGER DEFAULT 0,

    -- Storage efficiency metrics
    total_storage_bytes BIGINT DEFAULT 0,
    compression_ratio FLOAT DEFAULT 1.0,

    -- Communication patterns and interests
    communication_patterns JSONB,
    shared_interests TEXT[],
    conversation_themes JSONB,

    -- Temporal tracking
    relationship_started TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(companion_id, user_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_relationships_companion ON companion_relationships(companion_id);
CREATE INDEX idx_relationships_user ON companion_relationships(user_id);
CREATE INDEX idx_relationships_last_interaction ON companion_relationships(last_interaction DESC);
```

**Triggers:**
```sql
-- Auto-update relationship statistics when memories change
CREATE TRIGGER tr_update_relationship_stats
    AFTER INSERT OR UPDATE OR DELETE ON companion_memories
    FOR EACH ROW EXECUTE FUNCTION update_relationship_stats();
```

---

#### 3. `pca_models` - PCA Compression Models
**Purpose:** Store trained PCA models for consistent 768D→384D compression
**Row Estimate:** 10 - 100 models

**Schema:**
```sql
CREATE TABLE pca_models (
    model_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    companion_id VARCHAR(50),
    model_name VARCHAR(100) NOT NULL,

    -- PCA parameters
    n_components INTEGER NOT NULL,
    explained_variance_ratio FLOAT NOT NULL,

    -- Serialized model data
    model_data BYTEA NOT NULL,  -- Pickled sklearn PCA model

    -- Model metadata
    training_samples INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE(companion_id, model_name)
);
```

---

#### 4. `pq_models` - Product Quantization Models
**Purpose:** Store trained Product Quantization models for 768D→48 bytes compression
**Row Estimate:** 10 - 100 models

**Schema:**
```sql
CREATE TABLE pq_models (
    model_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    companion_id VARCHAR(50),
    model_name VARCHAR(100) NOT NULL,

    -- PQ parameters
    num_subspaces INTEGER NOT NULL DEFAULT 48,
    num_centroids INTEGER NOT NULL DEFAULT 256,
    subspace_dim INTEGER NOT NULL DEFAULT 16,

    -- Serialized centroids data
    centroids_data BYTEA NOT NULL,  -- Numpy array of centroids

    -- Model metadata
    training_samples INTEGER NOT NULL,
    average_reconstruction_quality FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE(companion_id, model_name)
);
```

---

#### 5. `compression_analytics` - Compression Performance Tracking
**Purpose:** Track compression performance and system efficiency
**Row Estimate:** 1,000 - 10,000 analytics records

**Schema:**
```sql
CREATE TABLE compression_analytics (
    analytics_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    companion_id VARCHAR(50),
    user_id UUID,

    -- Time period
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Memory statistics
    memories_created INTEGER DEFAULT 0,
    memories_compressed INTEGER DEFAULT 0,
    memories_accessed INTEGER DEFAULT 0,

    -- Compression statistics
    pca_compressions INTEGER DEFAULT 0,
    pq_compressions INTEGER DEFAULT 0,
    average_pca_quality FLOAT,
    average_pq_quality FLOAT,

    -- Storage efficiency
    total_original_size BIGINT DEFAULT 0,
    total_compressed_size BIGINT DEFAULT 0,
    overall_compression_ratio FLOAT,
    storage_savings_percent FLOAT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

#### 6. `memory_access_patterns` - Memory Access Tracking
**Purpose:** Track memory access patterns for optimization
**Row Estimate:** 100,000 - 1,000,000 access events

**Schema:**
```sql
CREATE TABLE memory_access_patterns (
    access_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_id UUID NOT NULL REFERENCES companion_memories(memory_id) ON DELETE CASCADE,

    -- Access details
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_type VARCHAR(50),  -- 'similarity_search', 'direct_recall', 'background_processing'
    similarity_score FLOAT,

    -- Performance metrics
    retrieval_time_ms INTEGER,
    decompression_time_ms INTEGER,
    reconstruction_quality FLOAT
);
```

**Indexes:**
```sql
CREATE INDEX idx_access_patterns_memory ON memory_access_patterns(memory_id);
CREATE INDEX idx_access_patterns_time ON memory_access_patterns(accessed_at DESC);
```

---

#### 7. `memory_tier_config` - Tier Configuration
**Purpose:** Memory tier configurations based on architecture
**Row Estimate:** 4 rows (one per tier)

**Schema:**
```sql
CREATE TABLE memory_tier_config (
    tier memory_tier_enum PRIMARY KEY,
    max_memories INTEGER,
    compression_after_days INTEGER,
    target_compression_type compression_type_enum,
    max_storage_bytes BIGINT,
    description TEXT
);
```

**Seeded Data:**
```sql
INSERT INTO memory_tier_config VALUES
('core', 50, NULL, 'full', 153600, 'Never compressed, full 768D embeddings'),
('important', 200, 30, 'pca384', 307200, 'PCA compressed to 384D after 30 days'),
('background', 500, 7, 'pq48', 24000, 'Product Quantized to 48 bytes after 7 days'),
('sparse', NULL, 0, 'sparse_only', NULL, 'Only sparse anchors, no embeddings');
```

---

#### 8. `avatar_agents` - Agent Avatar Management
**Purpose:** Agent avatar configurations
**Row Estimate:** 100 - 1,000 agents

**Schema:**
```sql
CREATE TABLE avatar_agents (
    agent_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name VARCHAR(50) UNIQUE NOT NULL,
    avatar_url TEXT,
    voice_id VARCHAR(50),
    personality_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);
```

---

#### 9. `schema_metadata` - Database Versioning
**Purpose:** Track schema version and metadata
**Row Estimate:** 5-10 metadata records

**Schema:**
```sql
CREATE TABLE schema_metadata (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Seeded Data:**
```sql
INSERT INTO schema_metadata VALUES
('schema_version', '2.0.0', NOW()),
('architecture_type', 'sparse_focus_shift', NOW()),
('compression_approach', 'selective_by_tier_and_age', NOW()),
('max_compression_ratio', '64:1 via Product Quantization', NOW());
```

---

### Views & Functions

#### View: `v_memory_efficiency`
**Purpose:** Memory system efficiency analysis

```sql
CREATE VIEW v_memory_efficiency AS
SELECT
    r.companion_id,
    r.user_id,
    r.total_memories,
    r.total_storage_bytes,
    r.compression_ratio,
    ROUND(r.total_storage_bytes / 1024.0, 2) as storage_kb,
    r.core_memories_count,
    r.important_memories_count,
    r.background_memories_count,
    r.sparse_memories_count,
    ROUND(100.0 * (r.core_memories_count::FLOAT / NULLIF(r.total_memories, 0)), 1) as core_memory_percent
FROM companion_relationships r;
```

#### View: `v_compression_candidates`
**Purpose:** Identify memories ready for compression

```sql
CREATE VIEW v_compression_candidates AS
SELECT
    memory_id,
    companion_id,
    user_id,
    tier,
    compression_type,
    created_at,
    EXTRACT(DAYS FROM (NOW() - created_at)) as age_days,
    CASE
        WHEN tier = 'important' AND age_days >= 30 AND compression_type = 'full'
             THEN 'PCA_CANDIDATE'
        WHEN tier = 'background' AND age_days >= 7 AND compression_type IN ('full', 'pca384')
             THEN 'PQ_CANDIDATE'
        ELSE 'NO_COMPRESSION'
    END as compression_recommendation
FROM companion_memories
WHERE compression_type != 'sparse_only';
```

#### Function: `record_memory_access()`
**Purpose:** Record memory access patterns

```sql
CREATE FUNCTION record_memory_access(
    p_memory_id UUID,
    p_access_type VARCHAR(50),
    p_similarity_score FLOAT DEFAULT NULL,
    p_retrieval_time_ms INTEGER DEFAULT NULL,
    p_decompression_time_ms INTEGER DEFAULT NULL,
    p_reconstruction_quality FLOAT DEFAULT NULL
) RETURNS VOID;
```

---

## poqpoq_pg Database

**Database Name:** `poqpoq_pg`
**Server:** poqpoq.com (EXTERNAL - separate server for security)
**Purpose:** User authentication, OAuth, payment processing
**Status:** ✅ Production Deployed (External Service)
**Tables:** ~15 (estimated - schema not directly accessible)
**Technology:** OAuth2, JWT tokens, Stripe/PayPal integration

**Note:** This database is hosted on a SEPARATE server (poqpoq.com) for security isolation and PCI compliance. BBWorlds services authenticate via API calls to the Payment Gateway, not direct database access.

---

### Authentication & User Management

#### Estimated Tables (Based on Payment Gateway Architecture)

1. **`users`** - User registration and authentication
   - OAuth provider integration (Google, Discord)
   - JWT token management
   - Email verification
   - Password hashing

2. **`user_sessions`** - Active session tracking
   - Session tokens
   - Device fingerprinting
   - IP address tracking
   - Expiration management

3. **`oauth_tokens`** - OAuth provider tokens
   - Access tokens
   - Refresh tokens
   - Provider-specific data
   - Expiration tracking

4. **`api_keys`** - Service API keys
   - Service-to-service authentication
   - Rate limiting
   - Quota management
   - Scopes and permissions

---

### Payment Processing

5. **`subscriptions`** - Subscription management
   - Plan types (free, basic, premium)
   - Billing cycles
   - Payment method storage
   - Auto-renewal settings

6. **`payments`** - Payment transactions
   - Stripe/PayPal integration
   - Transaction IDs
   - Amount and currency
   - Payment status

7. **`invoices`** - Invoice records
   - Invoice generation
   - PDF storage
   - Payment history
   - Tax calculations

---

### Security & Compliance

8. **`audit_logs`** - Security audit trail
   - User actions
   - Authentication attempts
   - Payment events
   - Admin operations

9. **`rate_limits`** - API rate limiting
   - Request counts
   - Throttling rules
   - Abuse detection
   - Cooldown periods

10. **`webhooks`** - Event webhooks
    - Stripe webhook events
    - PayPal notifications
    - User registration events
    - Subscription changes

---

### Integration with BBWorlds

**Authentication Flow:**
```
1. User login → poqpoq.com Payment Gateway
2. Gateway validates credentials → poqpoq_pg database
3. Gateway generates JWT token
4. Token sent to client
5. Client includes token in all BBWorlds API requests
6. BBWorlds services validate token via Gateway API (not direct DB access)
```

**API Endpoints:**
- `POST /auth/login` - User login
- `POST /auth/register` - New user registration
- `POST /auth/oauth/google` - Google OAuth
- `GET /auth/verify` - Validate JWT token
- `POST /subscriptions/create` - Create subscription
- `GET /subscriptions/:id` - Get subscription status

**Security Features:**
- PCI DSS compliant
- OAuth2 token rotation
- Rate limiting per user
- Audit log retention 90 days
- Payment tokenization (no raw card data stored)

---

## Quick Reference Tables

### Table Count by Database

| Database | Tables | Materialized Views | Regular Views | Functions | Total Objects |
|----------|--------|-------------------|---------------|-----------|---------------|
| **bbworlds_nexus** | 43 | 1 | 2 | 12+ | 58+ |
| **voice_ninja** | 9 | 0 | 3 | 5 | 17 |
| **poqpoq_pg** | ~15 | 0 | 0 | ~10 | ~25 |
| **TOTAL** | **67+** | **1** | **5** | **27+** | **100+** |

---

### Table Count by Category (bbworlds_nexus)

| Category | Tables | Purpose |
|----------|--------|---------|
| **Core User System** | 4 | Users, states, balances, sessions |
| **Instance System** | 2 | Virtual spaces and access control |
| **Quest System** | 8 | Quests, instances, progress, completions, templates, media, relationships, leaderboards |
| **Item & Inventory** | 4 | Items, templates, inventories, buildings |
| **Marketplace & Trading** | 3 | Listings, trade requests, transactions |
| **AI Companion** | 3 | Companions, conversations, memories (ref) |
| **Economy** | 1 | Token transactions |
| **Networking** | 1 | Chat messages |
| **Asset Registry** | 2 | Assets, asset usage |
| **Akashic Progression** | 2 | Transactions, leaderboard (view) |
| **Deity & Attributes** | 8 | Deities, blessings, bonds, transactions, tablets, hidden discoveries, attribute leaderboards (view) |
| **System Metadata** | 1 | Schema version |
| **Enhanced User (v2.0 - PLANNED)** | 6 | Characters, friends, blocks, contact cards, ratings, reports, auth tokens, verification |
| **TOTAL** | **43** | - |

---

### Column Count by Table Type

| Table Type | Column Count | Examples |
|------------|--------------|----------|
| **Core Tables** | 20-50 cols | users (45+ cols with migrations), quests (30+ cols) |
| **Junction Tables** | 5-10 cols | instance_visitors, quest_object_relationships |
| **Audit Tables** | 8-12 cols | akashic_transactions, attribute_transactions |
| **Configuration Tables** | 10-20 cols | deities, deity_blessings, challenge_templates |
| **Analytics Tables** | 15-25 cols | compression_analytics, asset_usage |

---

### JSONB Columns Summary

| Table | JSONB Columns | Purpose |
|-------|---------------|---------|
| **users** | 1 | metadata (preferences, stats) |
| **user_states** | 3 | position, velocity, rotation |
| **instances** | 1 | metadata (environment, permissions) |
| **instance_visitors** | 1 | permissions (granular access control) |
| **quests** | 4 | quest_data, rewards, instance_template, metadata |
| **quest_instances** | 1 | state (in-progress session data) |
| **quest_progress** | 1 | challenge_specific_data |
| **challenge_completions** | 4 | game_specific_stats, attributes_at_completion, attribute_rewards, akashic_essence |
| **user_uploaded_media** | 3 | svg_region_mapping, upload_metadata, ai_confidence_scores |
| **challenge_templates** | 1 | template_structure |
| **quest_object_relationships** | 1 | metadata |
| **items** | 1 | properties (dimensions, interactions) |
| **item_templates** | 2 | template_data, generation_rules |
| **inventories** | 1 | custom_properties |
| **buildings** | 5 | position, rotation, scale, interactions, license_snapshot |
| **trade_requests** | 2 | requester_items, recipient_items |
| **transactions** | 2 | items_transferred, metadata |
| **ai_companions** | 2 | appearance, position |
| **companion_conversations** | 2 | messages[], context_data |
| **assets** | 1 | default_scale |
| **akashic_transactions** | 1 | metadata |
| **akashic_tablet_discoveries** | 1 | location_found |
| **companion_memories** | 1 | interaction_context |
| **companion_relationships** | 3 | communication_patterns, conversation_themes |
| **compression_analytics** | 0 | - |
| **TOTAL** | **75+** | Hybrid architecture power |

---

### Vector Columns Summary (pgvector)

| Table | Vector Columns | Dimensions | Purpose |
|-------|----------------|------------|---------|
| **companion_memories** | 3 | 768D, 384D, 48B | Semantic memory search with compression |
| - full_embedding | vector(768) | 768D | Core memories, full resolution |
| - compressed_embedding | vector(384) | 384D | PCA compressed (2:1 ratio) |
| - quantized_embedding | BYTEA | 48 bytes | Product Quantized (64:1 ratio) |

**Performance:**
- **Similarity search**: <50ms for 100k memories (ivfflat index)
- **Compression**: 2:1 (PCA), 64:1 (Product Quantization)
- **Storage**: Core 3KB, Important 1.5KB, Background 48 bytes

---

### Index Strategy Summary

| Index Type | Count | Purpose | Example |
|------------|-------|---------|---------|
| **B-tree** | ~100 | Standard queries | idx_users_username |
| **GIN** | ~25 | JSONB, arrays, full-text | idx_quests_data |
| **ivfflat** | 2 | Vector similarity | idx_memories_full_embedding_cosine |
| **Hash** | 2 | Exact matches | idx_memories_conversation_hash |
| **Partial** | ~10 | Conditional indexing | WHERE status = 'active' |
| **Unique** | ~30 | Constraints | UNIQUE(user_id, deity_id) |
| **TOTAL** | **150+** | High performance |

---

### Materialized Views

| View | Database | Purpose | Refresh Strategy |
|------|----------|---------|------------------|
| **challenge_leaderboards** | bbworlds_nexus | Fast leaderboard queries | Auto-refresh every 5 min (rate-limited) |
| **attribute_leaderboards** | bbworlds_nexus | Attribute ranking queries | Manual refresh via function |
| **TOTAL** | **2** | <5ms queries | Periodic refresh |

---

### Regular Views

| View | Database | Purpose |
|------|----------|---------|
| **akashic_leaderboard** | bbworlds_nexus | Real-time akashic rankings |
| **v_memory_efficiency** | voice_ninja | Memory system efficiency analysis |
| **v_compression_candidates** | voice_ninja | Identify memories ready for compression |
| **v_memory_recall_performance** | voice_ninja | Memory recall performance metrics |
| **popular_assets** | bbworlds_nexus | Most used assets analytics |
| **TOTAL** | **5** | Real-time computed data |

---

### Stored Functions & Triggers

#### bbworlds_nexus Functions (12+)

| Function | Purpose | Called By |
|----------|---------|-----------|
| `update_akashic_rank_title()` | Auto-calculate rank from resonance | Trigger on users update |
| `award_akashic_essence()` | Award essence with transaction logging | Quest completion, donations |
| `award_attributes()` | Award attributes with audit trail | Quest completion, blessings |
| `calculate_blessing_amplification()` | Calculate faith-based amplification | Bonding system |
| `update_blessing_amplification()` | Update amplification when faith changes | Trigger on users.attr_faith |
| `increment_quest_play_counts()` | Update quest metrics on completion | Trigger on challenge_completions |
| `mark_high_scores()` | Auto-mark top 10% scores | Trigger on challenge_completions |
| `auto_refresh_leaderboards()` | Refresh leaderboards (rate-limited) | Trigger on challenge_completions |
| `create_user_balance()` | Auto-create balance for new users | Trigger on users insert |
| `populate_license_snapshot()` | Snapshot asset license on building placement | Trigger on buildings insert |
| `get_asset_info()` | Get asset info with license display | In-world asset inspection |
| `check_asset_license()` | Validate license compliance | Asset placement validation |

#### voice_ninja Functions (5)

| Function | Purpose |
|----------|---------|
| `update_relationship_stats()` | Update relationship statistics when memories change |
| `record_memory_access()` | Record memory access patterns |
| `refresh_challenge_leaderboards()` | Refresh leaderboard materialized view |

---

## Migration History

### Migration Timeline

| Migration | Date | Description | Tables Added | Columns Added | Status |
|-----------|------|-------------|--------------|---------------|--------|
| **Base Schema** | Aug 2025 | Initial NEXUS v1 database | 23 | ~300 | ✅ Deployed |
| **001** | Sep 2025 | Environment indexes | 0 | 0 | ✅ Deployed |
| **002** | Oct 2, 2025 | Asset registry | 2 | 3 | ✅ Deployed |
| **003** | Oct 3, 2025 | Quest & challenge system | 8 | 7 | ✅ Deployed |
| **004** | Oct 3, 2025 | Akashic progression | 2 | 14 | ✅ Deployed |
| **005** | Oct 3, 2025 | Attributes & deity system | 8 | 16 | ✅ Deployed |
| **v2.0** | Q1 2026 | Enhanced user system | 6 | ~50 | 📅 Planned |

### Migration 001: Environment Indexes
**Date:** September 2025
**Purpose:** Spatial query optimization
**Changes:**
- Added spatial indexes for zone-based lookups
- Performance: <10ms zone queries

---

### Migration 002: Asset Registry
**Date:** October 2, 2025
**Purpose:** Legal compliance and asset tracking
**Tables Added:**
- `assets` (16 seeded from Poly Haven - CC0)
- `asset_usage` (analytics)

**Columns Added to Existing Tables:**
- `buildings.asset_id` (FK to assets)
- `buildings.placed_by_companion` (deity tracking)
- `buildings.license_snapshot` (legal record)

**Functions Added:**
- `get_asset_info()` - Asset info with license display
- `check_asset_license()` - License validation
- `populate_license_snapshot()` - Auto-snapshot on placement

**Triggers Added:**
- `trigger_populate_license_snapshot` - On buildings insert

**Views Added:**
- `popular_assets` - Usage analytics

---

### Migration 003: Quest & Challenge System
**Date:** October 3, 2025
**Purpose:** Complete quest system for adult players
**Tables Added:**
- `quests` - Quest definitions
- `quest_instances` - Active sessions (memory-cached, 30s sync)
- `quest_progress` - User progress tracking
- `challenge_completions` - Permanent records
- `user_uploaded_media` - User content (images, audio, SVG)
- `challenge_templates` - Reusable patterns
- `quest_object_relationships` - Object links
- `challenge_leaderboards` - Materialized view

**Columns Added to Existing Tables:**
- `users.akashic_resonance`, `akashic_wisdom`, `akashic_creativity`, `akashic_connection`
- `users.akashic_rank`, `akashic_rank_title`
- `users.strength_discovery`, `strength_interpretation`, `strength_influence`
- `users.total_quests_completed`, `total_objects_donated`, `total_tokens_collected`
- `instances.instance_subtype`, `quest_id`

**Functions Added:**
- `refresh_challenge_leaderboards()` - Leaderboard refresh

**Triggers Added:**
- `trigger_increment_quest_counts` - Update quest metrics
- `trigger_mark_high_scores` - Auto-mark top 10%
- `trigger_auto_refresh_leaderboards` - Periodic refresh (rate-limited)

**Sample Templates Inserted:**
- Classic Match-3 (Bejeweled)
- Sophisticated Coloring (SVG)
- Image-Based Quiz (Educational)

---

### Migration 004: Akashic Progression
**Date:** October 3, 2025
**Purpose:** Player progression through resonance, essences, rank, strengths
**Tables Added:**
- `akashic_transactions` - Essence award audit trail

**Views Added:**
- `akashic_leaderboard` - Real-time rankings

**Columns Added to users:**
- 4 Essences: `akashic_resonance`, `akashic_wisdom`, `akashic_creativity`, `akashic_connection`
- Rank: `akashic_rank` (1-100), `akashic_rank_title`
- 3 Strengths: `strength_discovery`, `strength_interpretation`, `strength_influence`
- Tracking: `total_quests_completed`, `total_objects_donated`, `total_tokens_collected`, `passive_resonance_earned`
- Timestamps: `akashic_last_updated`, `last_rank_up`

**Functions Added:**
- `award_akashic_essence()` - Award essence with transaction logging
- `update_akashic_rank_title()` - Auto-calculate rank (7 tiers)

**Triggers Added:**
- `trigger_update_akashic_rank` - On essence changes

**Rank Tiers:**
1. Newcomer (0-100 resonance, rank 1-10)
2. Explorer (100-1,000, rank 11-25)
3. Seeker (1,000-5,000, rank 26-50)
4. Sage (5,000-20,000, rank 51-75)
5. Master (20,000-50,000, rank 76-90)
6. Elder (50,000-100,000, rank 91-99)
7. Eternal (100,000+, rank 100)

---

### Migration 005: Attributes & Deity System
**Date:** October 3, 2025
**Purpose:** 12 attributes, deity bonding, template integration
**Tables Added:**
- `deities` (14 seeded: 12 ritual ring + Bob + Thoth)
- `deity_blessings` (42 total: 3 per deity)
- `user_deity_bonds` (active bonding tracker)
- `attribute_transactions` (audit log)
- `akashic_tablet_discoveries` (Thoth easter egg)
- `hidden_deity_discoveries` (Bob & Thoth)

**Materialized Views Added:**
- `attribute_leaderboards` - Fast attribute ranking queries

**Columns Added to users:**
- **Physical Axis:** `attr_strength`, `attr_agility`, `attr_endurance`
- **Mental Axis:** `attr_magic`, `attr_wisdom`, `attr_cunning`
- **Social Axis:** `attr_leadership`, `attr_faith`, `attr_charisma`
- **Creative Axis:** `attr_creativity`, `attr_artistry`, `attr_innovation`
- **Easter Eggs:** `bob_unlocked`, `thoth_unlocked`, `akashic_tablets_collected`

**Columns Added to challenge_completions:**
- `attributes_at_completion` (JSONB)
- `attribute_rewards_awarded` (JSONB)
- `akashic_essence_awarded` (JSONB)

**Functions Added:**
- `award_attributes()` - Award attributes with audit trail
- `calculate_blessing_amplification()` - Faith-based amplification (1.0x-2.0x)
- `update_blessing_amplification()` - Update on faith changes

**Triggers Added:**
- `trigger_update_blessing_amplification` - On users.attr_faith update

**Faith Amplification Formula:**
- 0-20: 1.0x (no amplification)
- 21-40: 1.0 - 1.25x
- 41-60: 1.25 - 1.5x
- 61-80: 1.5 - 1.75x
- 81-100: 1.75 - 2.0x

---

## ER Diagrams

### Core User Flow
```
users (id) ──┬── user_states (user_id)
             ├── user_balances (user_id)
             ├── active_sessions (user_id)
             ├── inventories (user_id)
             ├── quest_progress (user_id)
             ├── challenge_completions (user_id)
             ├── user_deity_bonds (user_id)
             ├── akashic_transactions (user_id)
             ├── attribute_transactions (user_id)
             └── companion_memories (user_id) [voice_ninja DB]
```

### Quest System Flow
```
quests (id) ──┬── quest_instances (quest_id)
              ├── challenge_completions (quest_id)
              └── quest_object_relationships (quest_id)

quest_instances (id) ──┬── quest_progress (quest_instance_id)
                       └── challenge_completions (quest_instance_id)

challenge_templates (id) ──> quests (template-based generation)
```

### Instance System Flow
```
instances (id) ──┬── instance_visitors (instance_id)
                 ├── buildings (instance_id)
                 ├── quest_instances (instance_id)
                 └── user_states (instance_id)
```

### Deity System Flow
```
deities (id) ──┬── deity_blessings (deity_id)
               └── user_deity_bonds (deity_id)

deity_blessings (id) ──> user_deity_bonds (blessing_id)

users (id) ──> user_deity_bonds (user_id)
             └ attr_faith ──> blessing amplification (1.0x-2.0x)
```

### Asset System Flow
```
assets (id) ──┬── buildings (asset_id)
              ├── asset_usage (asset_id)
              └── items (references via properties JSONB)

buildings (id) ──┬── license_snapshot (auto-populated from assets)
                 └── placed_by_companion (deity tracking)
```

### AI Companion Memory Flow
```
companion_memories (id) ──┬── memory_access_patterns (memory_id)
                          └── compression based on tier & age

companion_relationships (id) ──> memory statistics (auto-updated)

pca_models (id) ──> compressed_embedding (768D -> 384D)
pq_models (id) ──> quantized_embedding (768D -> 48 bytes)
```

---

## Services Using These Databases

### NEXUS Server (Port 3020)
**Database:** bbworlds_nexus
**Tables Used:**
- users, user_states (real-time position updates)
- instances, instance_visitors (space management)
- quests, quest_instances, quest_progress (quest orchestration)
- active_sessions (connection tracking)
- chat_messages (world chat)
- akashic_transactions (essence awards)
- user_deity_bonds (bonding management)

---

### Cognition API
**Database:** bbworlds_nexus + voice_ninja
**Tables Used:**
- users (akashic queries, attribute queries)
- companion_memories (semantic memory search)
- companion_relationships (relationship tracking)
- quests (AI-generated quest creation)

---

### Bob GPT (Port 8081)
**Database:** voice_ninja
**Tables Used:**
- companion_memories (EEMS - Embedded Enhanced Memory System)
- companion_relationships (user bonding)
- pca_models, pq_models (compression)
- memory_access_patterns (performance tracking)

---

### Quest Creation UI
**Database:** bbworlds_nexus
**Tables Used:**
- quests, challenge_templates (quest authoring)
- user_uploaded_media (content uploads)
- quest_object_relationships (object linking)

---

### Marketplace System
**Database:** bbworlds_nexus
**Tables Used:**
- marketplace_listings (item sales)
- trade_requests (direct trades)
- transactions (audit trail)
- user_balances (token management)

---

### Building System
**Database:** bbworlds_nexus
**Tables Used:**
- buildings (placed structures)
- assets (asset catalog with licensing)
- asset_usage (analytics)
- items, inventories (item ownership)

---

### Payment Gateway (External)
**Database:** poqpoq_pg (poqpoq.com server)
**Tables Used:**
- users, user_sessions (authentication)
- oauth_tokens (OAuth integration)
- subscriptions, payments, invoices (payment processing)
- audit_logs (security)

---

## Performance Characteristics

### Query Performance Targets

| Query Type | Target Latency | Achieved | Notes |
|------------|----------------|----------|-------|
| **User lookup** | <5ms | ✅ <2ms | B-tree index on username |
| **Position update** | <10ms | ✅ <8ms | Zone-based spatial indexing |
| **Quest search** | <20ms | ✅ <15ms | GIN index on JSONB quest_data |
| **Leaderboard query** | <5ms | ✅ <2ms | Materialized views |
| **Vector similarity** | <50ms | ✅ <35ms | ivfflat index, 100k memories |
| **Asset lookup** | <10ms | ✅ <5ms | GIN index on tags |
| **Token transaction** | <15ms | ✅ <10ms | B-tree index on user_id + timestamp |
| **Deity bonding** | <20ms | ✅ <12ms | Partial unique index |

---

### Storage Efficiency

| Data Type | Before Compression | After Compression | Ratio | Technology |
|-----------|-------------------|-------------------|-------|------------|
| **Core memories** | 3KB (768D) | 3KB | 1:1 | No compression |
| **Important memories** | 3KB (768D) | 1.5KB (384D) | 2:1 | PCA compression |
| **Background memories** | 3KB (768D) | 48 bytes | 64:1 | Product Quantization |
| **Quest state** | Variable | Variable | N/A | JSONB compression |

---

### Connection Pool Allocation

**PostgreSQL Settings (poqpoq.com):**
```
max_connections = 150
```

**Per Service Allocation:**
- Bob GPT: 10 connections (memory queries)
- NEXUS: 50 connections (real-time updates)
- Cognition: 15 connections (AI operations)
- Quest System: 20 connections (quest management)
- Marketplace: 10 connections (economy)
- Payment Gateway: 20 connections (authentication - external DB)
- Reserved: 25 for maintenance

---

## Database Backup Strategy

### Daily Backups
```bash
# Backup bbworlds_nexus
pg_dump -U nexus_user -d bbworlds_nexus > /backups/nexus_$(date +%Y%m%d).sql

# Backup voice_ninja
pg_dump -U voice_ninja_user -d voice_ninja > /backups/voice_ninja_$(date +%Y%m%d).sql

# Sync to S3
aws s3 sync /backups/ s3://blackboxworlds-backups/
```

**Retention:**
- Local: 30 days
- S3: 90 days

**Critical Tables (Highest Priority):**
1. `companion_memories` (voice_ninja) - Irreplaceable conversation history
2. `users` (bbworlds_nexus) - User accounts and progression
3. `challenge_completions` (bbworlds_nexus) - Permanent achievement records
4. `assets` (bbworlds_nexus) - Legal compliance (license tracking)

---

## Security & Compliance

### Database Security

**Connection Security:**
- All connections via localhost (no remote access)
- Services use dedicated database users with minimal privileges
- Passwords stored in environment variables only
- SSL/TLS encryption for all connections

**Row-Level Security:**
- Users can only access their own data (enforced via WHERE user_id = $1)
- Inventory queries filtered by owner_id
- Instance access controlled via instance_visitors table

**Audit Trails:**
- `akashic_transactions` - All essence awards
- `attribute_transactions` - All attribute changes
- `transactions` - All economy activity
- `asset_usage` - All asset placement events
- `memory_access_patterns` - All memory queries (voice_ninja)

---

### PCI Compliance (poqpoq_pg)

**Payment Gateway Security:**
- Hosted on separate server for isolation
- No raw credit card data stored (tokenization via Stripe/PayPal)
- Audit logs retained 90 days
- OAuth2 token rotation
- Rate limiting per user

---

## Troubleshooting & Maintenance

### Common Issues

**Problem: Slow leaderboard queries**
```sql
-- Solution: Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY challenge_leaderboards;
REFRESH MATERIALIZED VIEW CONCURRENTLY attribute_leaderboards;
```

**Problem: Memory compression not running**
```sql
-- Check compression candidates
SELECT * FROM v_compression_candidates WHERE compression_recommendation != 'NO_COMPRESSION';

-- Manual compression trigger (run from Python EEMS service)
-- See: /home/ubuntu/bob-gpt/eems/compression.py
```

**Problem: Database connection pool exhausted**
```sql
-- Check active connections
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

-- Kill idle connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE state = 'idle' AND state_change < NOW() - INTERVAL '1 hour';
```

---

### Maintenance Commands

**Analyze tables for query planner:**
```sql
-- bbworlds_nexus
ANALYZE users;
ANALYZE quests;
ANALYZE challenge_completions;

-- voice_ninja
ANALYZE companion_memories;
```

**Vacuum tables to reclaim space:**
```sql
VACUUM ANALYZE users;
VACUUM ANALYZE companion_memories;
```

**Check table sizes:**
```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

---

## Development & Deployment

### Local Development
```bash
# Connect to local PostgreSQL (if running local dev)
psql -U postgres -d bbworlds_nexus_dev

# Run migrations
psql -U postgres -d bbworlds_nexus_dev < migrations/004_add_akashic_system.sql
```

### Production Deployment
```bash
# SSH to production server
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@poqpoq.com

# Connect to production database
psql -U nexus_user -d bbworlds_nexus

# Run migration (ALWAYS test in dev first!)
psql -U nexus_user -d bbworlds_nexus < /path/to/migration.sql

# Verify migration
SELECT * FROM schema_version ORDER BY applied_at DESC LIMIT 1;
```

---

## Future Enhancements

### Planned Schema Changes (v2.0 - Q1 2026)

**Enhanced User System:**
- `user_characters` - Character selection and custom uploads
- `user_friends` - Social connections
- `user_blocks` - User blocking/ignore
- `user_contact_cards` - Shareable profiles
- `content_ratings` - Maturity ratings
- `content_reports` - Moderation system
- `user_auth_tokens` - OAuth tokens (migrate from poqpoq_pg?)
- `adult_verification` - Age verification

**Estimated Timeline:**
- Schema design: December 2025
- Testing: January 2026
- Production deployment: February 2026

---

### Godstorm System (Future)

**New Tables Needed:**
- `divine_seeds` - Configuration entities with spatial data
- `godstorm_events` - Event history and metrics
- `seed_gifts` - Social trading system
- `configuration_cache` - Performance optimization
- `player_achievements` - Collection goals
- `player_omen_logs` - Prediction game

**Estimated Timeline:**
- Design: Q2 2026
- Phase 1 (MVP): Q3 2026
- Full rollout: Q4 2026

**See:** `/home/p0qp0q/blackbox/World/docs/DATABASE_COMPREHENSIVE_ANALYSIS_REPORT.md`

---

## Appendix: SQL Type Reference

### Custom ENUMs (voice_ninja)

```sql
-- Memory tiers
CREATE TYPE memory_tier_enum AS ENUM ('core', 'important', 'background', 'sparse');

-- Compression types
CREATE TYPE compression_type_enum AS ENUM ('full', 'pca384', 'pq48', 'sparse_only');

-- Relationship stages
CREATE TYPE relationship_stage_enum AS ENUM ('stranger', 'acquaintance', 'friend', 'close_friend');
```

---

### Common Column Patterns

**UUID Primary Keys:**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

**Timestamps:**
```sql
created_at TIMESTAMP DEFAULT NOW()
last_updated TIMESTAMP DEFAULT NOW()
```

**JSONB Metadata:**
```sql
metadata JSONB DEFAULT '{}'
```

**Boolean Flags:**
```sql
is_active BOOLEAN DEFAULT TRUE
is_public BOOLEAN DEFAULT FALSE
```

**Enums as VARCHAR:**
```sql
status VARCHAR(20) CHECK (status IN ('draft', 'active', 'archived'))
```

---

## Document Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Oct 9, 2025 | Initial comprehensive schema reference | Documentation Specialist Agent |

---

## Contact & Support

**Database Administration:**
- Server: poqpoq.com (AWS EC2 Ubuntu 24.04 LTS)
- PostgreSQL: 16.9
- SSH: `ssh -i ~/.ssh/poqpoq2025.pem ubuntu@poqpoq.com`

**Related Documentation:**
- `/home/p0qp0q/blackbox/World/docs/infra/services/DATABASE_GOOD_NEIGHBOR_POLICY_2025-10-03.md`
- `/home/p0qp0q/blackbox/World/docs/ai-architecture/chapter-12-nexus-database-schema.md`
- `/home/p0qp0q/blackbox/World/docs/DATABASE_COMPREHENSIVE_ANALYSIS_REPORT.md`
- `/home/p0qp0q/blackbox/World/docs/VOICE_NINJA_DATABASE_STRUCTURE.md`

---

**END OF COMPLETE DATABASE SCHEMA REFERENCE**

*This document serves as the single source of truth for all database tables across the poqpoq/BBWorlds ecosystem. Keep it updated with every migration.*