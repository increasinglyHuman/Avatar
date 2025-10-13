# Database Infrastructure Documentation - voice-ninja.com

## PostgreSQL Server Configuration

**Server**: voice-ninja.com (34.220.134.216)  
**Port**: 5432  
**Version**: PostgreSQL 16.x with pgvector extension

## Database Schema Overview

### 1. Voice Ninja Database (`voice_ninja`)
**Purpose**: AI Memory & Embeddings for Bob GPT service  
**User**: `voice_ninja_user`

#### EEMS Memory System Tables

```sql
-- Primary memory storage with selective compression
CREATE TABLE companion_memories (
    id SERIAL PRIMARY KEY,
    companion_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    memory_tier VARCHAR(20) DEFAULT 'BACKGROUND',
    
    -- Vector embeddings with compression tiers
    full_embedding vector(768),           -- Core memories (3KB each)
    compressed_embedding vector(384),     -- Important memories (PCA)
    quantized_embedding BYTEA,            -- Background memories (48 bytes)
    
    -- Metadata
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP,
    emotional_valence FLOAT,
    importance_score FLOAT DEFAULT 0.5,
    key_phrases TEXT[],
    
    -- Compression tracking
    compression_type VARCHAR(20),
    compression_ratio FLOAT,
    original_size_bytes INTEGER,
    compressed_size_bytes INTEGER
);

-- Memory relationship tracking
CREATE TABLE memory_relationships (
    id SERIAL PRIMARY KEY,
    memory_id INTEGER REFERENCES companion_memories(id),
    related_memory_id INTEGER REFERENCES companion_memories(id),
    relationship_type VARCHAR(50),
    strength FLOAT DEFAULT 0.5
);

-- Analytics and performance tracking
CREATE TABLE memory_analytics (
    id SERIAL PRIMARY KEY,
    companion_id VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_memories INTEGER,
    core_memories INTEGER,
    important_memories INTEGER,
    background_memories INTEGER,
    sparse_memories INTEGER,
    avg_compression_ratio FLOAT,
    total_storage_bytes BIGINT,
    retrieval_performance_ms FLOAT
);
```

### 2. BBWorlds NEXUS Database (`bbworlds_nexus`)
**Purpose**: Game state management and player data  
**User**: `nexus_user`

#### Core Game Tables

```sql
-- User management with OAuth support
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    maturity_rating INTEGER DEFAULT 0,
    account_status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255)
);

-- Character/avatar system
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    character_name VARCHAR(100) NOT NULL,
    model_url TEXT,
    customization_data JSONB,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Real-time position tracking
CREATE TABLE user_positions (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    instance_id UUID,
    position_x FLOAT,
    position_y FLOAT,
    position_z FLOAT,
    rotation_y FLOAT,
    animation_state VARCHAR(50),
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- World instances
CREATE TABLE instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id UUID,
    instance_type VARCHAR(50),
    max_users INTEGER DEFAULT 100,
    current_users INTEGER DEFAULT 0,
    server_region VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    state JSONB
);

-- Quest system
CREATE TABLE quest_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_id VARCHAR(100),
    instance_id UUID REFERENCES instances(id),
    participants UUID[],
    state JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
```

### 3. BBWorlds World Database (`bbworlds_world`)  
**Purpose**: World assets, spaces, and content  
**User**: `bbworlds_user`

#### Asset Management Tables

```sql
-- 3D assets and models
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50),
    file_url TEXT,
    thumbnail_url TEXT,
    metadata JSONB,
    creator_id UUID,
    license_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-created spaces
CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    space_name VARCHAR(255),
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    max_occupancy INTEGER DEFAULT 50,
    entry_point JSONB,
    skybox_settings JSONB,
    terrain_settings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Index Definitions

### pgvector Indexes (IVFFlat)

```sql
-- Vector similarity search indexes for memory system
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

-- Faster approximate search for large datasets
CREATE INDEX idx_memories_full_embedding_l2
    ON companion_memories
    USING ivfflat (full_embedding vector_l2_ops)
    WITH (lists = 100)
    WHERE full_embedding IS NOT NULL;
```

### GIN Indexes (Text Search)

```sql
-- Full text search on memory content
CREATE INDEX idx_memories_key_phrases_gin
    ON companion_memories 
    USING gin(key_phrases);

-- JSONB search for game state
CREATE INDEX idx_instances_state_gin
    ON instances 
    USING gin(state);

CREATE INDEX idx_quest_instances_state_gin
    ON quest_instances 
    USING gin(state);

-- Array search for participants
CREATE INDEX idx_quest_instances_participants_gin
    ON quest_instances 
    USING gin(participants);

-- Metadata search for assets
CREATE INDEX idx_assets_metadata_gin
    ON assets 
    USING gin(metadata);
```

### B-tree Indexes (Standard)

```sql
-- User lookup optimization
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);

-- Temporal queries
CREATE INDEX idx_memories_timestamp ON companion_memories(timestamp);
CREATE INDEX idx_memories_companion_user ON companion_memories(companion_id, user_id);

-- Position queries for game state
CREATE INDEX idx_user_positions_instance ON user_positions(instance_id);
CREATE INDEX idx_user_positions_last_update ON user_positions(last_update);
```

## Example Queries

### Memory Retrieval with pgvector

```sql
-- Find similar memories using cosine similarity
SELECT 
    id,
    content,
    1 - (full_embedding <=> $1::vector) as similarity,
    memory_tier,
    timestamp
FROM companion_memories
WHERE 
    companion_id = $2 
    AND user_id = $3
    AND full_embedding IS NOT NULL
ORDER BY full_embedding <=> $1::vector
LIMIT 10;

-- Hybrid search: vector similarity + text matching
SELECT 
    m.*,
    1 - (m.full_embedding <=> $1::vector) as vector_similarity,
    ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $2)) as text_rank
FROM companion_memories m
WHERE 
    m.companion_id = $3
    AND (
        m.full_embedding <=> $1::vector < 0.5
        OR to_tsvector('english', m.content) @@ plainto_tsquery('english', $2)
    )
ORDER BY 
    (0.7 * (1 - (m.full_embedding <=> $1::vector))) + 
    (0.3 * ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $2))) DESC
LIMIT 20;
```

### Compression Tier Management

```sql
-- Promote memory to higher tier
UPDATE companion_memories
SET 
    memory_tier = 'CORE',
    full_embedding = $1::vector,
    compressed_embedding = NULL,
    quantized_embedding = NULL,
    compression_type = 'NONE',
    compressed_size_bytes = 3072
WHERE id = $2;

-- Compress aging memories
UPDATE companion_memories
SET 
    memory_tier = 'BACKGROUND',
    full_embedding = NULL,
    compressed_embedding = NULL,
    quantized_embedding = $1::bytea,
    compression_type = 'PRODUCT_QUANTIZATION',
    compression_ratio = 64.0,
    compressed_size_bytes = 48
WHERE 
    memory_tier = 'IMPORTANT'
    AND last_accessed < NOW() - INTERVAL '30 days'
    AND access_count < 5;
```

### Game State Queries

```sql
-- Get nearby players in same instance
SELECT 
    u.username,
    u.display_name,
    up.position_x,
    up.position_y,
    up.position_z,
    up.animation_state,
    SQRT(
        POWER(up.position_x - $1, 2) + 
        POWER(up.position_y - $2, 2) + 
        POWER(up.position_z - $3, 2)
    ) as distance
FROM user_positions up
JOIN users u ON u.id = up.user_id
WHERE 
    up.instance_id = $4
    AND up.last_update > NOW() - INTERVAL '1 minute'
    AND SQRT(
        POWER(up.position_x - $1, 2) + 
        POWER(up.position_y - $2, 2) + 
        POWER(up.position_z - $3, 2)
    ) < 100
ORDER BY distance;

-- Active quest participants
SELECT 
    qi.*,
    array_agg(u.username) as participant_names
FROM quest_instances qi
CROSS JOIN LATERAL unnest(qi.participants) as participant_id
JOIN users u ON u.id = participant_id
WHERE 
    qi.instance_id = $1
    AND qi.completed_at IS NULL
GROUP BY qi.id;
```

### Performance Analytics

```sql
-- Memory system performance metrics
SELECT 
    companion_id,
    COUNT(*) as total_memories,
    COUNT(*) FILTER (WHERE memory_tier = 'CORE') as core_count,
    COUNT(*) FILTER (WHERE memory_tier = 'IMPORTANT') as important_count,
    COUNT(*) FILTER (WHERE memory_tier = 'BACKGROUND') as background_count,
    COUNT(*) FILTER (WHERE memory_tier = 'SPARSE') as sparse_count,
    AVG(compression_ratio) as avg_compression,
    SUM(compressed_size_bytes) as total_bytes,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY importance_score) as median_importance
FROM companion_memories
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY companion_id;

-- Instance load distribution
SELECT 
    i.id,
    i.world_id,
    i.current_users,
    i.max_users,
    (i.current_users::float / i.max_users) as load_factor,
    COUNT(up.user_id) as active_users,
    AVG(EXTRACT(epoch FROM (NOW() - up.last_update))) as avg_position_age_seconds
FROM instances i
LEFT JOIN user_positions up ON up.instance_id = i.id
WHERE i.created_at > NOW() - INTERVAL '1 hour'
GROUP BY i.id
ORDER BY load_factor DESC;
```

## Connection Configuration

### AsyncPG Connection Pool (Python)

```python
import asyncpg
import os

# Memory system connection
memory_pool = await asyncpg.create_pool(
    "postgresql://voice_ninja_user:password@localhost:5432/voice_ninja",
    min_size=5,
    max_size=20,
    command_timeout=60
)

# NEXUS game state connection  
nexus_pool = await asyncpg.create_pool(
    "postgresql://nexus_user:password@localhost:5432/bbworlds_nexus",
    min_size=10,
    max_size=50,
    command_timeout=30
)
```

### Node.js Connection (pg library)

```javascript
const { Pool } = require('pg');

// BBWorlds world database
const worldPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bbworlds_world',
  user: 'bbworlds_user',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Maintenance & Optimization

### Vacuum and Analyze Schedule

```sql
-- Regular maintenance for vector indexes
VACUUM ANALYZE companion_memories;
REINDEX INDEX CONCURRENTLY idx_memories_full_embedding_cosine;

-- Update table statistics
ANALYZE companion_memories (full_embedding, compressed_embedding);
ANALYZE user_positions;
```

### Connection Monitoring

```sql
-- Check active connections by database
SELECT 
    datname,
    usename,
    application_name,
    client_addr,
    state,
    COUNT(*) as connection_count
FROM pg_stat_activity
WHERE datname IN ('voice_ninja', 'bbworlds_nexus', 'bbworlds_world')
GROUP BY datname, usename, application_name, client_addr, state
ORDER BY datname, connection_count DESC;

-- Long-running queries
SELECT 
    pid,
    usename,
    datname,
    query,
    state,
    EXTRACT(epoch FROM (NOW() - query_start)) as duration_seconds
FROM pg_stat_activity
WHERE 
    state != 'idle'
    AND query_start < NOW() - INTERVAL '1 minute'
ORDER BY duration_seconds DESC;
```

## Security Notes

- All production databases use separate users with minimal required privileges
- Connections are restricted to localhost only (no external access)
- SSL/TLS required for all client connections
- Regular automated backups to S3
- Row-level security policies implemented for multi-tenant data