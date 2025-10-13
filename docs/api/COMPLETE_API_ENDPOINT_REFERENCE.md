# Complete API Endpoint Reference - poqpoq/BBWorlds

<div align="center">

![poqpoq API](https://img.shields.io/badge/poqpoq-Complete_API_Reference-00D4FF?style=for-the-badge&logo=api&logoColor=white)
![Version](https://img.shields.io/badge/Version-1.0.0-green?style=for-the-badge)
![Endpoints](https://img.shields.io/badge/Total_Endpoints-90+-blue?style=for-the-badge)
![Services](https://img.shields.io/badge/Services-7-purple?style=for-the-badge)

**The Single Source of Truth for ALL poqpoq/BBWorlds API Endpoints**

</div>

---

## 📋 Document Information

- **Version:** 1.0.0
- **Last Updated:** October 9, 2025
- **Total Endpoints Documented:** 90+
- **Services Covered:** 7 REST APIs + 1 Socket.IO service
- **Purpose:** Comprehensive endpoint reference for developers, AI agents, and integrators
- **Maintenance:** Auto-generated from source code analysis + manual documentation

---

## 📑 Quick Navigation

- [Overview & Service Matrix](#overview--service-matrix)
- [Base URLs by Environment](#base-urls-by-environment)
- [Authentication Guide](#authentication-guide)
- [Error Codes Reference](#error-codes-reference)
- [Rate Limiting Strategy](#rate-limiting-strategy)
- **Service-by-Service Documentation:**
  1. [NEXUS Server (Port 3020)](#1-nexus-server-port-3020) - 30+ REST + Socket.IO
  2. [Voice Ninja API (Port 3011)](#2-voice-ninja-api-port-3011) - TTS & Voice
  3. [AI Streams API (Port 8005)](#3-ai-streams-api-port-8005) - Unified AI
  4. [Cognition API (Port 8004)](#4-cognition-api-port-8004) - Vision & Memory
  5. [Perception API (Port 8003)](#5-perception-api-port-8003) - Spatial Awareness
  6. [BBWorlds API (Port 8002)](#6-bbworlds-api-port-8002) - World Rendering
  7. [Bob GPT API (Port 8081)](#7-bob-gpt-api-port-8081) - AI Companion
- [WebSocket Events Catalog](#websocket-events-catalog)
- [Integration Examples](#integration-examples)
- [Appendix: TypeScript Interfaces](#appendix-typescript-interfaces)

---

## Overview & Service Matrix

### Production Services (October 2025)

| Service | Port | Base Path | Protocol | Swagger Docs | Status | Endpoints |
|---------|------|-----------|----------|--------------|--------|-----------|
| **NEXUS** | 3020 | `/nexus` | HTTP + Socket.IO | ❌ None | ✅ Active | 30+ REST |
| **Voice Ninja** | 3011 | `/voice-ninja` | HTTP | ✅ [/voice-ninja/docs](https://poqpoq.com/voice-ninja/docs) | ✅ Active | 10+ |
| **AI Streams** | 8005 | `/ai-streams` | HTTP + WS | ✅ [/ai-streams/docs](https://poqpoq.com/ai-streams/docs) | ✅ Active | 7+ |
| **Cognition** | 8004 | `/cognition` | HTTP + WS | ✅ [/cognition/docs](https://poqpoq.com/cognition/docs) | ✅ Active | 18+ |
| **Perception** | 8003 | `/perception` | HTTP + WS | ✅ [/perception/docs](https://poqpoq.com/perception/docs) | ✅ Active | 6+ |
| **BBWorlds** | 8002 | `/bbworlds` | HTTP + WS | ✅ [/bbworlds/docs](https://poqpoq.com/bbworlds/docs) | ✅ Active | 8+ |
| **Bob GPT** | 8081 | `/bob-gpt` | HTTP | ✅ [/bob-gpt/docs](https://poqpoq.com/bob-gpt/docs) | ✅ Active | 5+ |

**Total Documented Endpoints:** 90+ (30+ NEXUS REST, 20+ Socket.IO events, 40+ other services)

### Endpoint Count by HTTP Method

| Method | Count | Primary Use Cases |
|--------|-------|-------------------|
| GET | 45+ | Health checks, stats, leaderboards, resources |
| POST | 35+ | Create quests, award essence, bond deities, upload |
| PATCH | 3+ | Update instance environment |
| DELETE | 2+ | Unbond deity, delete objects |
| WebSocket | 20+ | Real-time position, quest updates, environment |

---

## Base URLs by Environment

### Production (poqpoq.com)

```yaml
Primary Domain: https://poqpoq.com
Legacy Domain: https://voice-ninja.com  # Still works (backward compatibility)

Service URLs:
  NEXUS:      https://poqpoq.com/nexus
  Voice Ninja: https://poqpoq.com/voice-ninja
  AI Streams:  https://poqpoq.com/ai-streams
  Cognition:   https://poqpoq.com/cognition
  Perception:  https://poqpoq.com/perception
  BBWorlds:    https://poqpoq.com/bbworlds
  Bob GPT:     https://poqpoq.com/bob-gpt
```

### Development (Local)

```yaml
NEXUS:      http://localhost:3020
Voice Ninja: http://localhost:3011
AI Streams:  http://localhost:8005
Cognition:   http://localhost:8004
Perception:  http://localhost:8003
BBWorlds:    http://localhost:8002
Bob GPT:     http://localhost:8081
```

---

## Authentication Guide

### Three-Tier Authentication Policy

**Tier 1: Username (Real-time Socket.IO)**
- Use Case: Position updates, chat messages, low-security events
- Token Type: Plain username string
- Example: `socket.emit('user_register', { username: 'allen' })`
- Endpoints: Socket.IO events (position_update, chat_message, etc.)

**Tier 2: JWT (Standard HTTP Endpoints)**
- Use Case: API calls requiring authentication
- Token Type: JSON Web Token (Bearer)
- Header: `Authorization: Bearer <JWT_TOKEN>`
- Example:
  ```typescript
  fetch('https://poqpoq.com/nexus/quests/create', {
    headers: { 'Authorization': `Bearer ${jwt}` }
  })
  ```
- Endpoints: Quest creation, akashic awards, deity bonding

**Tier 3: User ID Match (Ownership Validation)**
- Use Case: Critical operations (profile, payments, account deletion)
- Validation: JWT user_id must match request :userId parameter
- Example: `GET /akashic/stats/:userId` - JWT must contain matching user_id
- Endpoints: Stats endpoints, resource access, unbonding

### OAuth Flow

**Provider:** poqpoq Authentication Gateway

**Endpoints:**
- Login: `https://poqpoq.com/auth/login`
- Callback: `https://poqpoq.com/auth/callback`
- Token Refresh: `https://poqpoq.com/auth/refresh`

**Flow:**
```
1. User → /auth/login (redirect)
2. Auth Gateway → OAuth provider (Google, etc.)
3. Callback → /auth/callback with JWT
4. Client stores JWT in localStorage
5. All API calls include: Authorization: Bearer <JWT>
```

---

## Error Codes Reference

### HTTP Status Codes

| Code | Meaning | When It Happens |
|------|---------|----------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created (quest, bond, etc.) |
| 400 | Bad Request | Missing required fields, invalid parameters |
| 401 | Unauthorized | Missing or invalid JWT token |
| 402 | Payment Required | Insufficient akashic essence/resonance |
| 403 | Forbidden | Rank too low, permission denied |
| 404 | Not Found | Quest/user/deity not found |
| 409 | Conflict | Already bonded, duplicate resource |
| 500 | Internal Server Error | Database/server error |

### Common Error Response Format

```typescript
{
  "error": "Human-readable error message",
  "details": "Specific details about what went wrong",
  "required": ["field1", "field2"],  // Missing fields
  "code": "ERROR_CODE"  // Machine-readable code
}
```

---

## Rate Limiting Strategy

### Current Implementation (October 2025)

**Status:** ⚠️ Rate limiting partially implemented

**NEXUS (Port 3020):**
- Current: No rate limiting
- Planned: 100 requests/minute per IP

**Python APIs (Cognition, AI Streams, Perception):**
- Current: No global limits
- Per-service: Handled by Uvicorn worker limits

**Best Practices:**
- Cache GET endpoints (health, stats, leaderboards) for 30-60 seconds
- Batch operations when possible
- Use WebSocket for real-time updates (not polling)
- Respect backoff headers when implemented

---

# 1. NEXUS Server (Port 3020)

<div align="center">

![NEXUS](https://img.shields.io/badge/Service-NEXUS-4CAF50?style=for-the-badge&logo=network&logoColor=white)
![Port 3020](https://img.shields.io/badge/Port-3020-blue?style=for-the-badge)
![Socket.IO](https://img.shields.io/badge/Protocol-Socket.IO_+_HTTP-black?style=for-the-badge)

**The Heart of poqpoq - Multi-User Networking & Game State**

</div>

**Purpose:** Real-time multi-user networking, quest system, akashic progression, deity bonding, instance persistence

**Base URL:** `https://poqpoq.com/nexus`

**Database:** PostgreSQL 16.9 (`bbworlds_nexus`)

**Protocol:** Express (REST) + Socket.IO (WebSocket)

**Swagger Docs:** ❌ None (Socket.IO service - no OpenAPI spec)

---

## 1.1 Health & Stats Endpoints

### GET /health

**Description:** Server health check with subsystem status

**Auth:** None (public)

**Response:**
```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down'
  database: boolean        // PostgreSQL connection
  redis: boolean           // Redis connection (future)
  websockets: boolean      // Active Socket.IO clients
  timestamp: Date
}
```

**Example:**
```bash
curl https://poqpoq.com/nexus/health
```

---

### GET /stats

**Description:** Real-time server statistics

**Auth:** None (public)

**Response:**
```typescript
interface ServerStats {
  connectedUsers: number
  activeQuests: number
  marketplaceListings: number  // Future
  messagesPerSecond: number
  averageLatency: number        // Future
  memoryUsage: {
    used: number
    total: number
    percentage: number
  }
  uptime: number               // Seconds
  version: string
}
```

---

### GET /zones

**Description:** Zone layout and population

**Auth:** None (public)

**Response:**
```json
{
  "zones": [
    {"name": "center", "population": 12},
    {"name": "north_west", "population": 3}
  ],
  "layout": "3x3 grid (200m x 200m per zone)"
}
```

---

### GET /users/online

**Description:** Online user count

**Auth:** None (public)

**Response:**
```json
{
  "count": 42,
  "users": ["user_id_1", "user_id_2", "..."]
}
```

---

## 1.2 Quest System Endpoints (6 endpoints)

### POST /quests/create

**Description:** Create quest from AI conversation (generates from natural language)

**Auth:** JWT required

**Request Body:**
```typescript
{
  userId: string          // Creator's user ID (from JWT)
  conversation: string    // AI conversation transcript
  templateId?: string     // Optional: 'bejeweled_3x3', 'gather_tokens', etc.
}
```

**Response (201 Created):**
```typescript
{
  success: true,
  quest_id: string,
  instance_id: string,
  resource_cost: {
    resonance: number,
    wisdom: number
  },
  message: "Quest created successfully"
}
```

**Example:**
```typescript
const response = await fetch('https://poqpoq.com/nexus/quests/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'uuid-here',
    conversation: 'User: I want to explore the enchanted forest...',
    templateId: 'gather_tokens'
  })
})
```

---

### GET /quests/list

**Description:** Browse available quests with filters

**Auth:** None (public quests)

**Query Parameters:**
- `category` (optional): 'gather' | 'reach' | 'timing' | 'puzzle' | 'educational'
- `difficulty` (optional): 1-5
- `tags` (optional): comma-separated tags
- `limit` (optional): default 20

**Response:**
```typescript
{
  quests: Quest[],
  count: number
}

interface Quest {
  id: string
  title: string
  description: string
  category: string
  difficulty: number
  rewards: {resonance, wisdom, creativity}
  creator_id: string
  created_at: Date
}
```

---

### GET /quests/:questId

**Description:** Get quest details

**Auth:** None (public)

**Response:** Full quest object with objectives

---

### GET /quests/:questId/leaderboard

**Description:** Quest leaderboard (high scores)

**Auth:** None (public)

**Query Parameters:**
- `period`: 'global' | 'weekly' | 'daily' (default 'global')
- `limit`: default 10

**Response:**
```typescript
{
  quest_id: string,
  period: string,
  leaderboard: [{
    rank: number,
    user_id: string,
    username: string,
    score: number,
    completion_time: number,  // seconds
    completed_at: Date
  }]
}
```

---

### GET /templates/list

**Description:** Available challenge templates

**Auth:** None (public)

**Query Parameters:**
- `category` (optional): 'gather' | 'puzzle' | 'educational' | 'timing'
- `complexity` (optional): 'simple' | 'moderate' | 'complex'

**Response:**
```typescript
{
  templates: [{
    id: string,
    name: string,
    category: string,
    description: string,
    complexity: string
  }],
  count: number
}
```

**Available Templates:**
- `bejeweled_3x3` - Match-3 puzzle
- `coloring_book` - SVG coloring challenge
- `quiz_trivia` - Multiple choice quiz
- `gather_tokens` - Token collection
- `reach_location` - Navigation challenge
- `timing_challenge` - Speed-based competition

---

### GET /users/:userId/resources

**Description:** Check user's akashic resources (for quest creation cost)

**Auth:** JWT (must match userId)

**Response:**
```typescript
{
  resonance: number,
  wisdom: number,
  creativity: number,
  connection: number,
  rank: number,
  rank_title: string
}
```

---

## 1.3 Akashic System Endpoints (4 endpoints)

### POST /akashic/award

**Description:** Award akashic essence (quest completion, donations, social)

**Auth:** JWT required

**Request Body:**
```typescript
{
  user_id: string,
  resonance?: number,      // default 0
  wisdom?: number,         // default 0
  creativity?: number,     // default 0
  connection?: number,     // default 0
  source_type: string,     // 'quest_completion', 'donation', 'social_interaction'
  source_id?: string,      // Quest ID, object ID, etc.
  metadata?: object        // Additional context
}
```

**Response:**
```typescript
{
  awarded: {resonance, wisdom, creativity, connection},
  new_totals: {resonance, wisdom, creativity, connection},
  ranked_up: boolean,
  new_rank?: number,
  new_rank_title?: string
}
```

**Database Trigger:** Automatic rank-up calculation when threshold met

---

### GET /akashic/stats/:userId

**Description:** User's akashic progression stats

**Auth:** JWT (must match userId)

**Response:**
```typescript
{
  akashic_resonance: number,
  akashic_wisdom: number,
  akashic_creativity: number,
  akashic_connection: number,
  akashic_rank: number,
  akashic_rank_title: string,
  akashic_last_updated: Date,
  strength_discovery: number,
  strength_interpretation: number,
  strength_influence: number,
  total_quests_completed: number,
  total_objects_donated: number,
  total_tokens_collected: number,
  passive_resonance_earned: number,
  last_rank_up: Date
}
```

---

### GET /akashic/leaderboard

**Description:** Global akashic rankings

**Auth:** None (public)

**Query Parameters:**
- `limit`: default 100
- `offset`: default 0

**Response:**
```typescript
{
  leaderboard: [{
    rank: number,
    user_id: string,
    username: string,
    total_resonance: number,
    rank_title: string,
    ...
  }],
  count: number
}
```

**Note:** Uses materialized view `akashic_leaderboard` for performance

---

### GET /akashic/transactions/:userId

**Description:** User's akashic transaction history

**Auth:** JWT (must match userId)

**Query Parameters:**
- `limit`: default 50

**Response:**
```typescript
{
  transactions: [{
    transaction_type: string,
    resonance_delta: number,
    wisdom_delta: number,
    creativity_delta: number,
    connection_delta: number,
    source_type: string,
    source_id: string,
    metadata: object,
    created_at: Date
  }],
  count: number
}
```

---

## 1.4 Attribute System Endpoints (3 endpoints)

### POST /attributes/award

**Description:** Award attribute points (quest completion, blessings)

**Auth:** JWT required

**Request Body:**
```typescript
{
  user_id: string,
  strength?: number,
  agility?: number,
  endurance?: number,
  magic?: number,
  wisdom?: number,
  cunning?: number,
  leadership?: number,
  faith?: number,
  charisma?: number,
  creativity?: number,
  artistry?: number,
  innovation?: number,
  source_type: string,
  source_id?: string,
  metadata?: object
}
```

**Response:** Award confirmation with new totals

---

### GET /attributes/stats/:userId

**Description:** User's attribute stats

**Auth:** JWT (must match userId)

**Response:**
```typescript
{
  attr_strength: number,
  attr_agility: number,
  attr_endurance: number,
  attr_magic: number,
  attr_wisdom: number,
  attr_cunning: number,
  attr_leadership: number,
  attr_faith: number,
  attr_charisma: number,
  attr_creativity: number,
  attr_artistry: number,
  attr_innovation: number
}
```

---

### GET /attributes/leaderboard

**Description:** Attribute rankings

**Auth:** None (public)

**Query Parameters:**
- `attribute`: 'all' | 'strength' | 'agility' | 'magic' | ... (default 'all')
- `limit`: default 100

**Response:**
```typescript
{
  leaderboard: [{
    user_id: string,
    username: string,
    value: number,  // Attribute value or overall rank
    akashic_rank: number
  }],
  attribute: string
}
```

---

## 1.5 Deity Bonding Endpoints (5 endpoints)

### GET /deities/available/:userId

**Description:** Deities available for bonding (based on user rank)

**Auth:** JWT required

**Response:**
```typescript
{
  deities: [{
    id: string,
    deity_name: string,
    display_name: string,
    pantheon: string,
    primary_color: string,
    min_rank_required: number,
    is_hidden: boolean,        // Bob, Thoth (special unlock)
    blessing_count: number
  }],
  count: number,
  user_rank: number
}
```

---

### GET /deities/:deityName

**Description:** Deity details with blessings

**Auth:** None (public)

**Response:**
```typescript
{
  id: string,
  deity_name: string,
  display_name: string,
  pantheon: string,
  domain: string,
  description: string,
  lore: string,
  primary_color: string,
  min_rank_required: number,
  blessings: [{
    id: string,
    blessing_name: string,
    display_name: string,
    primary_attribute: string,
    primary_bonus: number,      // e.g., 10 = +10%
    secondary_attribute: string,
    secondary_bonus: number
  }]
}
```

---

### POST /deities/bond

**Description:** Bond with a deity (requires rank, grants blessing)

**Auth:** JWT required

**Request Body:**
```typescript
{
  user_id: string,
  deity_name: string,
  blessing_id: string  // Which blessing to activate
}
```

**Response (201 Created):**
```typescript
{
  success: true,
  bond: {
    user_id: string,
    deity_id: string,
    blessing_id: string,
    faith_at_bonding: number,
    current_amplification: number,  // 1.0-2.0x based on faith
    bonded_at: Date
  },
  blessing: {...},
  faith_bonus_awarded: 10  // +10 faith for bonding
}
```

**Errors:**
- 403: Rank too low
- 409: Already bonded to this deity

---

### GET /deities/bonds/:userId

**Description:** User's active deity bonds

**Auth:** JWT (must match userId)

**Response:**
```typescript
{
  bonds: [{
    deity_name: string,
    display_name: string,
    pantheon: string,
    blessing_name: string,
    primary_attribute: string,
    primary_bonus: number,
    current_amplification: number,
    bonded_at: Date
  }],
  count: number
}
```

---

### POST /deities/unbond

**Description:** Unbond from deity (costs resonance, loses faith)

**Auth:** JWT required

**Request Body:**
```typescript
{
  user_id: string,
  deity_name: string,
  resonance_cost?: number  // default 1000
}
```

**Response:**
```typescript
{
  success: true,
  resonance_cost: number,
  faith_penalty: -10
}
```

**Errors:**
- 402: Insufficient resonance
- 404: Deity not found

---

## 1.6 Instance Persistence Endpoints (6 endpoints)

### GET /instances/personal/:userId

**Description:** Get or create user's personal instance

**Auth:** JWT (must match userId)

**Response:**
```typescript
{
  id: string,
  user_id: string,
  name: string,
  type: 'personal',
  max_visitors: number,
  is_public: boolean,
  metadata: {
    environment: {
      sky_preset?: string,
      time_of_day?: string,
      weather?: string,
      lighting_mood?: string,
      terrain_biome?: string
    },
    objects: WorldObject[],
    created_at: Date,
    last_modified: Date
  }
}
```

**Note:** Auto-creates instance if doesn't exist

---

### POST /instances/:instanceId/objects

**Description:** Save object to instance (place tree, building, etc.)

**Auth:** JWT (must be owner or have permission)

**Request Body:**
```typescript
{
  object: {
    id: string,
    type: 'glb' | 'primitive' | 'tree' | 'building',
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number],
    metadata: {
      name?: string,
      creator?: string,
      glb_url?: string,
      primitive_type?: 'box' | 'sphere' | 'cylinder',
      color?: string
    }
  }
}
```

**Response:**
```typescript
{
  objectId: string,
  saved: boolean,
  timestamp: Date
}
```

---

### GET /instances/:instanceId/objects

**Description:** Load all objects in instance

**Auth:** JWT required

**Response:**
```typescript
{
  objects: WorldObject[],
  count: number,
  instanceId: string
}
```

---

### DELETE /instances/:instanceId/objects/:objectId

**Description:** Delete object from instance

**Auth:** JWT (must be owner)

**Response:**
```typescript
{
  deleted: boolean,
  objectId: string,
  timestamp: Date
}
```

---

### PATCH /instances/:instanceId/environment

**Description:** Update instance environment settings

**Auth:** JWT (must be owner or have permission)

**Request Body:**
```typescript
{
  sky_preset?: string,     // 'sunset', 'stormy', 'dawn', etc.
  time_of_day?: string,
  weather?: string,
  lighting_mood?: string,
  terrain_biome?: string
}
```

**Response:**
```typescript
{
  success: boolean,
  updated_fields: string[],
  timestamp: Date
}
```

---

### POST /instances/:instanceId/reset

**Description:** Reset instance to default state (deletes all objects)

**Auth:** JWT (must be owner)

**Response:**
```typescript
{
  success: boolean,
  objects_deleted: number,
  environment_reset: boolean,
  timestamp: Date
}
```

---

## 1.7 Dual Progression Endpoints (4 endpoints)

**Purpose:** Combat Level (XP) + Akashic Rank (Resonance) tracking

**Migration:** 006_add_dual_progression.sql (October 10, 2025)

---

### POST /users/:userId/xp

**Description:** Award XP to user (combat, quests, activities)

**Auth:** JWT required

**Request Body:**
```typescript
{
  amount: number,        // XP to award
  source: string,        // 'enemy_kill', 'quest_complete', 'object_placed'
  metadata?: object      // Optional context
}
```

**Response:**
```typescript
{
  success: true,
  newXP: number,         // Total XP after award
  newLevel: number,      // Current combat level
  leveledUp: boolean,    // Did they level up?
  xpToNext: number,      // XP needed for next level
  oldLevel: number,
  healthBonus: number,   // +50 HP per level
  attributePoints: number // +2 points per level
}
```

**Example:**
```bash
curl -X POST https://poqpoq.com/nexus/users/USER_ID/xp \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{"amount": 500, "source": "quest_complete"}'
```

---

### POST /users/:userId/resonance

**Description:** Award Resonance to user (building, donating, creating)

**Auth:** JWT required

**Request Body:**
```typescript
{
  amount: number,        // Resonance to award
  source: string,        // 'object_placed', 'object_donated', 'seed_planted'
  metadata?: object
}
```

**Response:**
```typescript
{
  success: true,
  newResonance: number,
  newRank: number,       // Akashic rank
  rankedUp: boolean,
  seedCapacity: number,  // 3, 5, 8, 12, 20, or 999
  oldRank: number,
  resonanceToNext: number
}
```

---

### GET /users/:userId/progression

**Description:** Get complete dual progression data

**Auth:** JWT required

**Response:**
```typescript
{
  level: number,
  xp: number,
  xpToNext: number,
  rank: number,
  resonance: number,
  resonanceToNext: number,
  attributes: {
    magic: number,
    faith: number,
    strength: number,
    agility: number,
    charisma: number,
    cunning: number
  },
  resourceType: 'mana' | 'stamina',
  seedCapacity: number,
  unspentAttributePoints: number
}
```

---

### GET /users/:userId/xp/history

**Description:** XP/Resonance event history (audit trail)

**Auth:** JWT required

**Query Params:**
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```typescript
{
  events: Array<{
    event_type: string,
    xp_awarded: number,
    resonance_awarded: number,
    metadata: object,
    created_at: Date
  }>,
  count: number,
  limit: number,
  offset: number
}
```

---

## 1.8 Other NEXUS Endpoints

### POST /instances/switch

**Description:** Switch user to different instance

**Auth:** JWT required

**Request Body:**
```typescript
{
  user_id: string,
  instance_id: string
}
```

---

### POST /exports/upload

**Description:** Upload GLB file (avatar, object)

**Auth:** JWT required

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file`: GLB file (max 10MB)
- `userId`: Owner UUID
- `name`: Asset name
- `description`: Optional description

---

### POST /procedural/create

**Description:** Generate GLB from AI description (future)

**Auth:** JWT required

**Request Body:**
```typescript
{
  userId: string,
  description: string,  // "A medieval castle tower"
  style?: string,       // 'realistic' | 'stylized' | 'low_poly'
  size?: string         // 'small' | 'medium' | 'large'
}
```

---

# 2. Voice Ninja API (Port 3011)

<div align="center">

![Voice Ninja](https://img.shields.io/badge/Service-Voice_Ninja-ff6b35?style=for-the-badge&logo=microphone&logoColor=white)

**Text-to-Speech & Voice Synthesis**

</div>

**Base URL:** `https://poqpoq.com/voice-ninja`

**Swagger Docs:** [/voice-ninja/docs](https://poqpoq.com/voice-ninja/docs)

**Purpose:** Text-to-speech synthesis, phoneme generation for lip-sync, voice cloning

---

## 2.1 Voice Synthesis

### POST /api/voices/synthesize

**Description:** Convert text to speech with emotion and phoneme data

**Auth:** Optional API key (recommended for rate limiting)

**Request:**
```typescript
{
  text: string,          // Max 5000 characters
  voice_id: string,      // 'sultry_witch', 'wise_elder', etc.
  emotion?: number,      // 0.0-1.0 (default 0.5)
  speed?: number,        // 0.5-2.0 (default 1.0)
  pitch?: number         // 0.5-2.0 (default 1.0)
}
```

**Response:**
```typescript
{
  audio_url: string,     // CDN URL (5 min TTL)
  phonemes: [{
    phoneme: string,     // 'AH', 'EE', 'OH', etc.
    startTime: number,   // Seconds
    duration: number
  }],
  duration: number,      // Total seconds
  format: 'mp3' | 'wav'
}
```

**Available Voices:** 25+ (see Swagger docs for full list)
- `sultry_witch`, `wise_elder`, `cheerful_child`, `robotic`, `narrator`, etc.

---

### POST /api/voices/clone

**Description:** Create custom voice from audio samples

**Auth:** JWT + API key required

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `samples`: 5-10 WAV files (16kHz)
- `voiceName`: Custom voice identifier
- `userId`: Owner UUID

---

### POST /api/speech-to-text

**Description:** Transcribe audio to text

**Auth:** Optional API key

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `audio`: Audio file (WAV, MP3, OGG)
- `language`: 'en' | 'es' | 'fr' | etc.

**Response:**
```typescript
{
  transcript: string,
  confidence: number,  // 0.0-1.0
  words: [{
    word: string,
    startTime: number,
    endTime: number,
    confidence: number
  }],
  duration: number
}
```

---

# 3. AI Streams API (Port 8005)

<div align="center">

![AI Streams](https://img.shields.io/badge/Service-AI_Streams-9C27B0?style=for-the-badge&logo=message&logoColor=white)

**Unified AI Conversation Engine**

</div>

**Base URL:** `https://poqpoq.com/ai-streams`

**Swagger Docs:** [/ai-streams/docs](https://poqpoq.com/ai-streams/docs)

**Purpose:** Unified AI conversations with tool command parsing

---

## 3.1 Core Endpoints

### GET /

**Description:** API information

**Auth:** None

**Response:** Service metadata

---

### GET /health

**Description:** Health check

**Auth:** None

---

### GET /telemetry

**Description:** Performance metrics

**Auth:** None

---

### POST /cognition/stream

**Description:** Stream AI conversation with tool command extraction

**Auth:** JWT required

**Request:**
```typescript
{
  user_message: string,
  companion_id: string,  // 'artemis', 'freya', etc.
  user_id: string,
  context?: {
    position?: [number, number, number],
    nearby_objects?: string[],
    environment?: string
  }
}
```

**Response:**
```typescript
{
  response: string,        // AI response text
  tool_commands?: [{
    tool: string,          // 'setSky', 'plantTree', etc.
    args: string | object,
    companion_id: string
  }],
  emotion?: string,
  confidence: number
}
```

---

### POST /perception/spatial-spreadsheet

**Description:** Query nearby quest objects (spatial awareness)

**Auth:** JWT required

**Request:**
```typescript
{
  user_position: {x: number, z: number},
  radius: number,
  filter?: {
    type?: 'quest_token' | 'akashic_seed' | etc.,
    quest_id?: string
  }
}
```

**Response:**
```typescript
{
  objects: [{
    id: string,
    type: string,
    position: {x, y, z},
    distance: number,
    direction: string,
    metadata: object
  }]
}
```

---

### POST /cognition/process

**Description:** Process cognition request with perception data

**Auth:** JWT required

---

### GET /status

**Description:** Service status with active connections

**Auth:** None

---

### WebSocket /ws/

**Description:** Real-time AI conversation stream

**Protocol:** Plain WebSocket

**Events:**
- `message` - User message
- `response` - AI response (chunked)
- `tool_command` - Tool command extracted
- `error` - Error message

---

# 4. Cognition API (Port 8004)

<div align="center">

![Cognition](https://img.shields.io/badge/Service-Cognition-E91E63?style=for-the-badge&logo=brain&logoColor=white)

**Vision Processing & AI Memory**

</div>

**Base URL:** `https://poqpoq.com/cognition`

**Swagger Docs:** [/cognition/docs](https://poqpoq.com/cognition/docs)

**Purpose:** Vision processing (BLIP), memory retrieval (EEMS), decision making

---

## 4.1 Core Endpoints (18 total)

### GET /

**Description:** API information

### GET /health

**Description:** Health check with subsystems

### POST /cognition/process

**Description:** Process cognition request with vision + perception

**Auth:** JWT required

---

### POST /memory/search

**Description:** RAG knowledge retrieval (quest seeds, tool usage)

**Auth:** JWT required

**Request:**
```typescript
{
  query: string,
  companion_id?: string,
  filter?: {
    category?: 'tool_usage' | 'quest_knowledge',
    tool_name?: string
  },
  limit?: number
}
```

**Response:**
```typescript
{
  results: [{
    entry_id: string,
    snippet: string,
    similarity: number,     // 0.0-1.0
    significance: number,   // 0.0-1.0
    category: string
  }]
}
```

---

### GET /memory/search/metrics

**Description:** Memory search performance metrics

---

### GET /cognition/memory/:user_id

**Description:** Get user's memory entries

---

### DELETE /cognition/memory/:user_id

**Description:** Clear user memory (debugging)

---

### GET /cognition/status

**Description:** Cognition service status

---

### GET /perception/stats

**Description:** Perception processing stats

---

### POST /perception/focus-shift

**Description:** Shift perception focus

---

### POST /perception/game-event

**Description:** Record game event for perception

---

### POST /vision/analyze

**Description:** Analyze image with BLIP

**Auth:** JWT required

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `image`: Image file or base64

**Response:**
```typescript
{
  description: string,     // BLIP-generated description
  objects?: DetectedObject[],
  scene_type?: string,
  confidence: number,
  analysis_time: number    // Milliseconds
}
```

---

### POST /perception/vision/process

**Description:** Process vision stream

---

### GET /perception/vision/stats

**Description:** Vision processing statistics

---

### POST /tokenize

**Description:** Tokenize text for context assembly

---

### POST /assemble_context

**Description:** Assemble context with tokenizer awareness

---

### GET /tokenizer/metrics

**Description:** Tokenizer metrics

---

### GET /metrics

**Description:** Service metrics

---

### GET /metrics/prometheus

**Description:** Prometheus metrics

---

### GET /metrics/kpi-check

**Description:** KPI health check

---

### WebSocket /api/cognition/ws/vision/:userId

**Description:** Real-time vision stream

**Protocol:** Plain WebSocket

**Events:**
- `frame` - Send camera frame (base64)
- `analysis` - Receive vision analysis
- `error` - Error message

---

# 5. Perception API (Port 8003)

<div align="center">

![Perception](https://img.shields.io/badge/Service-Perception-00BCD4?style=for-the-badge&logo=eye&logoColor=white)

**Spatial Awareness & Environment Context**

</div>

**Base URL:** `https://poqpoq.com/perception`

**Swagger Docs:** [/perception/docs](https://poqpoq.com/perception/docs)

**Purpose:** Spatial awareness, object tracking, proximity detection

---

## 5.1 Endpoints (6+ total)

### POST /track

**Description:** Register quest objects in spatial index

**Auth:** JWT required

**Request:**
```typescript
{
  objects: [{
    id: string,
    type: 'quest_token' | 'akashic_seed' | etc.,
    position: {x: number, y: number, z: number},
    quest_id?: string,
    collectible?: boolean,
    proximity_hint?: string
  }]
}
```

---

### POST /spatial/query

**Description:** Find nearby quest objects

**Auth:** JWT required

**Request:**
```typescript
{
  user_position: {x: number, z: number},
  radius: number,
  filter?: {
    type?: string[]
  }
}
```

---

### POST /deduplicate

**Description:** Remove duplicate observations

---

### POST /update

**Description:** Update spatial context

---

### WebSocket /ws/perception/

**Description:** Real-time spatial awareness stream

**Protocol:** Plain WebSocket

**Events:**
- `spatial_update` - Position and context
- `object_proximity` - Nearby objects
- `zone_change` - Zone transition

---

# 6. BBWorlds API (Port 8002)

<div align="center">

![BBWorlds](https://img.shields.io/badge/Service-BBWorlds-4CAF50?style=for-the-badge&logo=globe&logoColor=white)

**World Environment Control**

</div>

**Base URL:** `https://poqpoq.com/bbworlds`

**Swagger Docs:** [/bbworlds/docs](https://poqpoq.com/bbworlds/docs)

**Purpose:** Sky, terrain, weather, lighting control

---

## 6.1 Endpoints (8+ total)

### POST /sky/set-time-of-day

**Description:** Quest-driven time changes

**Request:**
```typescript
{
  time_of_day: 'sunrise' | 'noon' | 'sunset' | 'midnight',
  hour?: number,
  minute?: number
}
```

---

### POST /sky/set-weather

**Description:** Environmental storytelling

**Request:**
```typescript
{
  weather: 'clear' | 'cloudy' | 'rainy' | 'stormy'
}
```

---

### POST /terrain/set-biome

**Description:** Biome transitions

**Request:**
```typescript
{
  biome: 'forest' | 'desert' | 'volcanic' | 'tundra'
}
```

---

### POST /announce

**Description:** Server-wide announcements

**Request:**
```typescript
{
  message: string,
  type: 'deity_manifestation' | 'quest' | 'system',
  priority: 'low' | 'medium' | 'high'
}
```

**Response:**
```typescript
{
  broadcast_count: number  // Players notified
}
```

---

### WebSocket /ws

**Description:** Companion chat WebSocket

---

# 7. Bob GPT API (Port 8081)

<div align="center">

![Bob GPT](https://img.shields.io/badge/Service-Bob_GPT-FFC107?style=for-the-badge&logo=robot&logoColor=white)

**21B AI Companion with EEMS Memory**

</div>

**Base URL:** `https://poqpoq.com/bob-gpt`

**Swagger Docs:** [/bob-gpt/docs](https://poqpoq.com/bob-gpt/docs)

**Purpose:** EEMS-enhanced AI personality, deity knowledge, autonomous quests

---

## 7.1 Endpoints (5+ total)

### POST /chat

**Description:** Chat with Bob (21B parameter model)

**Auth:** JWT required

**Request:**
```typescript
{
  userId: string,
  message: string,
  context?: {
    memories?: Memory[],
    perception?: SpatialUpdate
  }
}
```

**Response:**
```typescript
{
  response: string,
  reasoning?: string,      // Bob's thought process
  tool_commands?: ToolCommand[],
  emotion: string
}
```

---

### POST /embed

**Description:** Generate embeddings for quest knowledge

---

### POST /memory/search

**Description:** Retrieve deity knowledge, quest lore

---

### POST /memory/clear/:user_id

**Description:** Reset user memory

---

# WebSocket Events Catalog

## NEXUS Socket.IO Events (Port 3020)

**Namespace:** `/` (default)

**Connection URL:** `https://poqpoq.com` (path: `/nexus/`)

### Connection Events

**user_register**
```typescript
// Client → Server
{
  username: string,
  user_id?: string
}
```

**heartbeat**
```typescript
// Client → Server (every 30s)
{}
```

**disconnect**
```typescript
// Automatic - no payload
```

---

### Position & Movement

**position_update**
```typescript
// Client → Server (adaptive 5-10s)
{
  position: [number, number, number],
  velocity: [number, number, number],
  rotation: [number, number, number],
  activityState: 'moving' | 'idle' | 'interacting'
}
```

**zone_transition**
```typescript
// Client → Server
{
  userId: string,
  fromZone: string,
  toZone: string,
  position: [number, number, number]
}
```

---

### Instance Management

**instance_join**
```typescript
// Client → Server
{
  instanceId: string,
  userId: string
}
```

**instance_leave**
```typescript
// Client → Server
{
  instanceId: string,
  userId: string
}
```

**user_joined** (broadcast)
```typescript
// Server → All clients in instance
{
  userId: string,
  username: string,
  position: [number, number, number]
}
```

**user_left** (broadcast)
```typescript
// Server → All clients in instance
{
  userId: string
}
```

---

### Quest Events

**quest_start**
```typescript
// Client → Server
{
  questId: string,
  userId: string,
  participants?: string[]
}
```

**quest_join**
```typescript
// Client → Server
{
  questInstanceId: string,
  userId: string
}
```

**quest_update**
```typescript
// Client → Server
{
  questInstanceId: string,
  objectiveId: string,
  progress: number,      // 0-100
  completed: boolean
}
```

**quest_completed** (broadcast)
```typescript
// Server → All quest participants
{
  questId: string,
  rewards: {resonance, wisdom, creativity},
  participants: string[]
}
```

---

### Chat Events

**chat_message**
```typescript
// Client → Server
{
  userId: string,
  message: string,
  type: 'text' | 'emote' | 'system',
  zone?: string  // Zone-based chat
}
```

**message_received** (broadcast)
```typescript
// Server → Zone/instance
{
  userId: string,
  username: string,
  message: string,
  type: string,
  timestamp: Date
}
```

---

### Companion Events

**companion_speak**
```typescript
// Client → Server (or autonomous)
{
  companion_id: string,
  text: string,
  audio_url?: string,
  emotion?: string
}
```

**companion_move**
```typescript
// Client → Server (or autonomous)
{
  companion_id: string,
  position: [number, number, number],
  animation?: string
}
```

---

### Environment Events

**environment_change**
```typescript
// Client → Server
{
  tool: 'setSky' | 'setTime' | 'setWeather',
  args: string | object,
  companion_id?: string,
  userId: string
}
```

**environment_query**
```typescript
// Client → Server
{
  instanceId: string
}
```

**environment_updated** (broadcast)
```typescript
// Server → All users in instance
{
  tool: string,
  args: any,
  companion_id?: string,
  applied: boolean
}
```

---

### Building Events

**building_place**
```typescript
// Client → Server
{
  instanceId: string,
  object: {
    type: 'tree' | 'primitive' | 'glb',
    position: [number, number, number],
    metadata: object
  }
}
```

**building_placed** (broadcast)
```typescript
// Server → All users in instance
{
  objectId: string,
  object: {...}
}
```

**building_delete**
```typescript
// Client → Server
{
  instanceId: string,
  objectId: string
}
```

---

# Integration Examples

## Example 1: Complete Quest and Award Akashic Essence

```typescript
// Frontend detects quest completion
socket.emit('quest_update', {
  questInstanceId: 'quest-uuid-123',
  objectiveId: 'final_objective',
  progress: 100,
  completed: true
})

// Server broadcasts completion
socket.on('quest_completed', async (data) => {
  const { questId, rewards, participants } = data

  // Award akashic essence to all participants
  for (const userId of participants) {
    const response = await fetch('https://poqpoq.com/nexus/akashic/award', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        resonance: rewards.resonance,
        wisdom: rewards.wisdom,
        creativity: rewards.creativity,
        connection: rewards.connection,
        source_type: 'quest_completion',
        source_id: questId,
        metadata: {
          quest_title: "The Moon Garden's Secret",
          completion_time_seconds: 1847,
          perfect_completion: true
        }
      })
    })

    const result = await response.json()

    // Check if ranked up
    if (result.ranked_up) {
      showNotification(`Quest Complete! Rank Up: ${result.new_rank_title}`)
    }
  }
})
```

---

## Example 2: AI Deity Command → Multi-User Environment Change

```typescript
// User speaks to AI companion
const ws = new WebSocket('wss://poqpoq.com/ai-streams/ws/')
ws.send(JSON.stringify({
  type: 'message',
  userId: 'uuid',
  companion_id: 'freya',
  message: 'Make it sunset'
}))

// AI responds with tool command
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // data.tool_commands = [{ tool: 'setSky', args: 'sunset', companion_id: 'freya' }]

  // Execute via NEXUS
  const nexusClient = window.nexusClient
  nexusClient.sendEnvironmentChange('setSky', 'sunset', 'freya')
}

// NEXUS broadcasts to all users in instance
socket.on('environment_updated', (data) => {
  if (data.tool === 'setSky') {
    environmentManager.applySkyPreset(data.args)
    // Sky changes to sunset for everyone!
  }
})
```

---

## Example 3: Token Collection → Quest Progress → Essence Award

```typescript
// Proximity detection
if (distance < 2.0) {
  // Token collected!
  const token = tokenManager.collectToken(tokenId)

  // Update quest progress
  socket.emit('quest_update', {
    questInstanceId: activeQuest.instanceId,
    objectiveId: 'collect_5_tokens',
    progress: tokensCollected / 5 * 100,
    completed: tokensCollected >= 5
  })
}

// Server-side quest completion handler
if (completed) {
  const quest = await db.query('SELECT * FROM quests WHERE id = $1', [questId])

  // Award resonance
  await fetch('https://poqpoq.com/nexus/akashic/award', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}` },
    body: JSON.stringify({
      user_id: userId,
      resonance: quest.rewards.resonance,
      source_type: 'quest_completion'
    })
  })
}
```

---

## Example 4: Deity Bonding → Blessing Amplification

```typescript
// User bonds with Artemis
const response = await fetch('https://poqpoq.com/nexus/deities/bond', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: 'uuid-here',
    deity_name: 'Artemis',
    blessing_id: 'artemis_blessing_1'  // +10% agility
  })
})

const result = await response.json()
// result.blessing = { primary_attribute: 'agility', primary_bonus: 10, ... }
// result.faith_bonus_awarded = 10

// Frontend applies multipliers
const faithAmplifier = calculateFaithAmplifier(userFaith)  // 1.0-2.0x
const effectiveAgility = baseAgility * faithAmplifier * 1.10  // +10% blessing
// With 150 faith (1.5x) and +10% blessing:
// effectiveAgility = 50 * 1.5 * 1.10 = 82.5
```

---

# Appendix: TypeScript Interfaces

## Core Types

```typescript
// User
interface User {
  id: string
  username: string
  email: string
  display_name?: string
  created_at: Date
  akashic_rank: number
  akashic_rank_title: string
}

// Position
type Position = [number, number, number]
type Rotation = [number, number, number]
type Scale = [number, number, number]

interface Transform {
  position: Position
  rotation: Rotation
  scale: Scale
}

// Quest
interface Quest {
  id: string
  title: string
  description: string
  category: 'gather' | 'reach' | 'timing' | 'puzzle' | 'educational'
  difficulty: number  // 1-5
  objectives: QuestObjective[]
  rewards: QuestRewards
  creator_id: string
  created_at: Date
  completion_count: number
  average_rating: number
}

interface QuestObjective {
  id: string
  type: 'gather' | 'reach' | 'timing' | 'interact'
  description: string
  target: string | number
  current: number
  completed: boolean
}

interface QuestRewards {
  resonance: number
  wisdom: number
  creativity: number
  connection: number
  attributes?: { [key: string]: number }
}

// Akashic
interface AkashicStats {
  userId: string
  rank: number
  rankName: string
  essences: {
    resonance: number
    wisdom: number
    creativity: number
    connection: number
  }
  strengths: {
    discovery: number
    interpretation: number
    influence: number
  }
  totalEssence: number
  nextRankRequirement: number
  progress: number  // 0.0-1.0
}

// Attributes
type AttributeName =
  | 'strength' | 'agility' | 'endurance'
  | 'magic' | 'wisdom' | 'cunning'
  | 'leadership' | 'faith' | 'charisma'
  | 'creativity' | 'artistry' | 'innovation'

interface AttributeStats {
  [key: string]: number
}

// Deity
interface Deity {
  id: string
  deity_name: string
  display_name: string
  pantheon: string
  domain: string
  description: string
  lore: string
  primary_color: string
  min_rank_required: number
  is_hidden: boolean
  blessings: Blessing[]
}

interface Blessing {
  id: string
  blessing_name: string
  display_name: string
  primary_attribute: AttributeName
  primary_bonus: number      // e.g., 10 = +10%
  secondary_attribute?: AttributeName
  secondary_bonus?: number
}

interface DeityBond {
  deity_name: string
  faith_at_bonding: number
  current_amplification: number  // 1.0-2.0x
  bonded_at: Date
  interaction_count: number
  blessings: Blessing[]
}

// Instance
interface Instance {
  id: string
  type: 'personal' | 'communal'
  owner_id?: string
  name: string
  max_visitors: number
  is_public: boolean
  metadata: {
    environment: EnvironmentState
    objects: WorldObject[]
    created_at: Date
    last_modified: Date
  }
}

interface EnvironmentState {
  sky_preset?: string
  time_of_day?: string
  weather?: string
  lighting_mood?: string
  terrain_biome?: string
}

interface WorldObject {
  id: string
  type: 'glb' | 'primitive' | 'tree' | 'building'
  position: Position
  rotation: Rotation
  scale: Scale
  metadata: {
    name?: string
    creator?: string
    glb_url?: string
    primitive_type?: string
    color?: string
  }
}

// Tool Commands
interface ToolCommand {
  tool: string
  args: string | object
  companion_id: string
}

// Voice
interface SynthesizeRequest {
  text: string
  voice_id: string
  emotion?: number
  speed?: number
  pitch?: number
}

interface Phoneme {
  phoneme: string
  startTime: number
  duration: number
}
```

---

## Summary Statistics

**Total Endpoints Documented:** 90+
- **NEXUS (Port 3020):** 30 REST endpoints
- **Voice Ninja (Port 3011):** 10+ endpoints
- **AI Streams (Port 8005):** 7 endpoints
- **Cognition (Port 8004):** 18 endpoints
- **Perception (Port 8003):** 6+ endpoints
- **BBWorlds (Port 8002):** 8 endpoints
- **Bob GPT (Port 8081):** 5 endpoints
- **Socket.IO Events:** 20+ events

**Breakdown by HTTP Method:**
- GET: 45+ (health, stats, leaderboards, resources)
- POST: 35+ (create, award, bond, upload)
- PATCH: 3 (update environment)
- DELETE: 2 (unbond, delete objects)
- WebSocket: 20+ (real-time events)

**Services Covered:** 7 REST APIs + 1 Socket.IO service

**Authentication Tiers:**
- Public (no auth): 25+ endpoints
- JWT Required: 50+ endpoints
- User ID Match: 15+ endpoints

**File Location:** `/home/p0qp0q/blackbox/World/docs/COMPLETE_API_ENDPOINT_REFERENCE.md`

**Endpoints Not Fully Documented:**
- ⚠️ Godstorm event endpoints (designed but not implemented)
- ⚠️ Seed configuration endpoints (designed but not implemented)
- ⚠️ Autonomous agent endpoints (designed but not implemented)

---

<div align="center">

## 🎉 Welcome to poqpoq - The AI-First Metaverse 🎉

![Built with Love](https://img.shields.io/badge/Built_with-❤️-red?style=for-the-badge)
![poqpoq Team](https://img.shields.io/badge/by-poqpoq_team-00D4FF?style=for-the-badge&logo=team&logoColor=white)
![Powered by Claude](https://img.shields.io/badge/Documentation_by-Claude_Code_🤖-7B68EE?style=for-the-badge&logo=anthropic&logoColor=white)

</div>

---

**Last Updated:** October 9, 2025
**Version:** 1.0.0
**Maintained By:** Documentation Specialist Agent
**Next Review:** After Godstorm Phase 1 implementation
