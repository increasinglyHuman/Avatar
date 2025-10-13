<div align="center">

![poqpoq](https://img.shields.io/badge/poqpoq-Good_Neighbor_Policy-00D4FF?style=for-the-badge&logo=handshake&logoColor=white)
![API Architecture](https://img.shields.io/badge/API-Architecture_v2.2-4CAF50?style=for-the-badge&logo=sitemap&logoColor=white)
![Production](https://img.shields.io/badge/Status-Production_Deployed-green?style=for-the-badge&logo=checkmark&logoColor=white)

</div>

---

# Good Neighbor Policy: API Architecture & Port Allocation v2.2

**Version 2.2 - Akashic & Godstorm Integration**
**Date**: October 5, 2025 (Updated from v2.1 - October 3, 2025)
**Context**: poqpoq Three-Layer Architecture - As Actually Implemented

## 📝 v2.2 Changes (October 5, 2025)

- **Rebranded**: BBWorlds → **poqpoq** throughout documentation
- **Domain migration**: voice-ninja.com → poqpoq.com (legacy still supported)
- **Added Akashic system endpoints** (4 new REST routes)
- **Added Deity bonding endpoints** (5 new REST routes)
- **Added Godstorm admin endpoints** (3 new REST routes - Phase 1)
- **Added Instance persistence endpoints** (6 new REST routes)
- **Updated service descriptions** for customer-facing clarity
- **Shield.io badges** added for visual consistency

---

## 📝 Previous Version History

### v2.1 Changes (October 3, 2025)
- Added NEXUS quest creation endpoints (6 new REST routes)
- Quest system database migration 003 deployed
- Updated port allocation matrix with quest API details

### v2.0 Changes (August 31, 2025)
During implementation (Aug 27-31, 2025), we discovered that theoretical architecture often needs adjustment when meeting reality. Version 2.0 reflects what's **actually deployed and working** rather than what was initially planned.

**Key Learning: "Deploy First, Perfect Later"**
- Original plan had WebSockets on ports 9001-9003
- Reality: Services naturally clustered around 8002-8005
- Lesson: Use available infrastructure rather than forcing idealistic designs

**Major Corrections:**
1. **Avatar uploads** moved to User Services (not Presentation) - user ownership requires auth
2. **WebSocket consolidation** - Unified AI Streams handles multiple AI concerns
3. **NEXUS uses Socket.IO** - Better for game state management than plain WebSocket
4. **Companion Chat** stays separate - Direct user interaction needs dedicated service

---

## 🏗️ Service Architecture Overview

<div align="center">

![Three-Layer](https://img.shields.io/badge/Architecture-Three_Layer_Design-7B68EE?style=for-the-badge&logo=layers&logoColor=white)
![Microservices](https://img.shields.io/badge/Pattern-Microservices-00BCD4?style=for-the-badge&logo=docker&logoColor=white)
![Event Driven](https://img.shields.io/badge/Model-Event_Driven-FFC107?style=for-the-badge&logo=bolt&logoColor=white)

</div>

Following the **poqpoq Three-Layer Architecture** with practical adjustments based on deployment reality.

---

## 📊 Port Allocation Matrix (ACTUAL - October 2025)

### HTTP/HTTPS Services

<div align="center">

![Voice Ninja](https://img.shields.io/badge/🎤_Voice_Ninja-Port_3011-ff6b35?style=for-the-badge&logo=microphone&logoColor=white)
![AI Streams](https://img.shields.io/badge/💬_AI_Streams-Port_8005-9C27B0?style=for-the-badge&logo=message&logoColor=white)
![Cognition](https://img.shields.io/badge/🧠_Cognition-Port_8004-E91E63?style=for-the-badge&logo=brain&logoColor=white)
![Perception](https://img.shields.io/badge/👁️_Perception-Port_8003-00BCD4?style=for-the-badge&logo=eye&logoColor=white)
![NEXUS](https://img.shields.io/badge/🌐_NEXUS-Port_3020-4CAF50?style=for-the-badge&logo=network-wired&logoColor=white)
![Bob GPT](https://img.shields.io/badge/🤖_Bob_GPT-Port_8081-FFC107?style=for-the-badge&logo=robot&logoColor=white)

</div>

| Service | Port | Protocol | Purpose | Layer | Status |
|---------|------|----------|---------|--------|--------|
| **Voice Ninja API** | 3011 | HTTPS/HTTP | Voice synthesis & phoneme data | Presentation | ✅ Active |
| **User Services API** | 3012 | HTTPS/HTTP | Auth, avatar uploads, inventory | Infrastructure | 🔄 Planned |
| **poqpoq Presentation API** | 8002 | HTTPS/HTTP | World rendering, animations | Presentation | ✅ Active |
| **poqpoq Perception API** | 8003 | HTTPS/HTTP | Spatial awareness, environment | Perception | ✅ Active |
| **poqpoq Cognition API** | 8004 | HTTPS/HTTP | Vision processing, BLIP integration | Cognition | ✅ Active |
| **Unified AI Streams** | 8005 | HTTPS/HTTP | Consolidated AI services | All AI Layers | ✅ Active |
| **Bob GPT API** | 8081 | HTTPS/HTTP | Bob-21B AI companion | Cognition | ✅ Active |
| **Chatterbox TTS** | 8080 | HTTP | Voice synthesis engine (internal) | Presentation | ✅ Active |
| **NEXUS Server** | 3020 | HTTP/Socket.IO | Game state, networking, quests, akashic | Infrastructure | ✅ Active |

---

### NEXUS REST Endpoints (30+ endpoints - October 2025)

<div align="center">

![Quest System](https://img.shields.io/badge/Quest_System-6_endpoints-FFC107?style=for-the-badge&logo=target&logoColor=white)
![Akashic System](https://img.shields.io/badge/Akashic_System-4_endpoints-9C27B0?style=for-the-badge&logo=infinity&logoColor=white)
![Deity Bonding](https://img.shields.io/badge/Deity_Bonding-5_endpoints-E91E63?style=for-the-badge&logo=star&logoColor=white)
![Instance System](https://img.shields.io/badge/Instance_Persistence-6_endpoints-00BCD4?style=for-the-badge&logo=database&logoColor=white)
![Godstorm](https://img.shields.io/badge/Godstorm_Phase_1-3_endpoints-FF5722?style=for-the-badge&logo=cloud&logoColor=white)

</div>

#### Quest System (6 endpoints)
- `POST /nexus/quests/create` - Create quest from AI conversation
- `GET /nexus/quests/list` - Browse quests (filterable by category/difficulty)
- `GET /nexus/quests/:questId` - Quest details
- `GET /nexus/quests/:questId/leaderboard` - High scores (global/weekly/daily)
- `GET /nexus/templates/list` - Challenge templates (Bejeweled, coloring, quiz)
- `GET /nexus/users/:userId/resources` - Check akashic resources

#### Akashic System (4 endpoints)
- `POST /nexus/akashic/award` - Award essence (resonance/wisdom/creativity/connection)
- `GET /nexus/akashic/stats/:userId` - User's akashic progression stats
- `GET /nexus/akashic/leaderboard` - Global rankings
- `GET /nexus/akashic/transactions/:userId` - Transaction history

#### Attribute System (3 endpoints)
- `POST /nexus/attributes/award` - Award attribute points
- `GET /nexus/attributes/stats/:userId` - User's attribute stats
- `GET /nexus/attributes/leaderboard` - Attribute rankings

#### Deity Bonding (5 endpoints)
- `GET /nexus/deities/available/:userId` - Deities user can access
- `GET /nexus/deities/:deityName` - Deity details with blessings
- `POST /nexus/deities/bond` - Bond with deity
- `GET /nexus/deities/bonds/:userId` - User's active bonds
- `POST /nexus/deities/unbond` - Unbond from deity

#### Instance Persistence (6 endpoints)
- `GET /nexus/instances/personal/:userId` - Get/create personal instance
- `POST /nexus/instances/:instanceId/objects` - Save placed object
- `GET /nexus/instances/:instanceId/objects` - Load all objects
- `DELETE /nexus/instances/:instanceId/objects/:objectId` - Delete object
- `PATCH /nexus/instances/:instanceId/environment` - Update environment
- `POST /nexus/instances/:instanceId/reset` - Reset instance

#### Godstorm Events - Phase 1 (3 endpoints - Admin only)
- `POST /nexus/admin/godstorm/summon` - Manually trigger Godstorm event
- `GET /nexus/admin/godstorm/events` - List recent Godstorm events
- `POST /nexus/admin/godstorm/:eventId/end` - End ongoing Godstorm

---

### WebSocket Services (Real-time Communication)

| Service | Port | Path | Protocol | Purpose | Status |
|---------|------|------|----------|---------|--------|
| **Companion WebSocket** | 8002 | /ws | Plain WS | AI companion chat | ✅ Active |
| **Perception Stream** | 8003 | /ws/perception/ | Plain WS | Spatial awareness stream | ✅ Active |
| **Cognition Vision** | 8004 | /api/cognition/ws/ | Plain WS | Camera vision processing | ✅ Active |
| **Unified AI Streams** | 8005 | /ai-streams/ws/ | Plain WS | Combined AI services | ✅ Active |
| **NEXUS Game State** | 3020 | /nexus/ | Socket.IO | Player sync & world state | ✅ Active (systemd) |

---

### 🎯 Why These Ports?

![Logical Clustering](https://img.shields.io/badge/Design-Logical_Clustering-blue?style=for-the-badge&logo=network-wired&logoColor=white)

- **8002-8005**: Natural clustering of AI services (easy to remember, sequential)
- **3020**: NEXUS needed separation from AI services (game state is distinct)
- **3011-3012**: User-facing services on 3000 range (convention)
- **8080-8081**: Internal/backend services (not directly exposed)
- **Lesson**: Don't fight your infrastructure - work with it

---

## 🎯 Three-Layer Architecture (As Implemented)

<div align="center">

![Presentation](https://img.shields.io/badge/Layer_1-Presentation-ff6b35?style=for-the-badge&logo=eye&logoColor=white)
![Perception](https://img.shields.io/badge/Layer_2-Perception-00BCD4?style=for-the-badge&logo=radar&logoColor=white)
![Cognition](https://img.shields.io/badge/Layer_3-Cognition-9C27B0?style=for-the-badge&logo=brain&logoColor=white)
![Infrastructure](https://img.shields.io/badge/Foundation-Infrastructure-4CAF50?style=for-the-badge&logo=server&logoColor=white)

</div>

---

### **PRESENTATION LAYER**
```yaml
Purpose: Render and display the world
Services:
  - poqpoq Presentation API (8002): Basic endpoints
  - Voice Ninja API (3011): Voice synthesis
  - Chatterbox TTS (8080): Internal voice engine

Responsibilities:
  - Render avatars (NOT upload them)
  - Display animations
  - Execute visual commands
  - Spatial audio playback
  - GLB model loading

What it DOESN'T do:
  - Store avatars (that's User Services)
  - Make creative decisions (that's Cognition)
  - Track spatial awareness (that's Perception)
```

---

### **PERCEPTION LAYER**
```yaml
Purpose: Understand what's happening in the world
Services:
  - Perception API (8003): Spatial awareness
  - Vision Processing (8004): BLIP image understanding

Data Streams:
  - User positions and movements
  - Object proximity detection
  - Environmental context (time, weather)
  - Camera vision descriptions
  - Token collection detection

Key Innovation:
  - Adaptive perception rates based on activity
  - Deduplication to reduce noise (70% reduction)
  - Integration with memory system (EEMS)
  - Sub-300ms perception updates
```

---

### **COGNITION LAYER**
```yaml
Purpose: Make intelligent decisions with creative freedom
Services:
  - Bob GPT (8081): 21B parameter AI companion
  - Cognition API (8004): Vision and decision making
  - Companion WebSocket (8002/ws): Real-time chat

Capabilities:
  - Creative storytelling
  - Emotional memory (EEMS)
  - Vision understanding (BLIP)
  - Command generation for Presentation
  - Tool teaching (emergent creativity)

Maximum Freedom For:
  - Narrative generation
  - Character personality
  - World-building suggestions
  - Problem-solving approaches
  - Deity decision-making (autonomous quests)
```

---

### **INFRASTRUCTURE LAYER**
```yaml
Purpose: Core services and user management
Services:
  - NEXUS (3020): Game state networking, quests, akashic
  - User Services (3012): Authentication & user data
  - Database: PostgreSQL 16.9 for persistence

Key Responsibilities:
  - User authentication (via poqpoq Auth Gateway)
  - Avatar upload and storage (User Services)
  - Game state synchronization (NEXUS)
  - Session management (Socket.IO)
  - Quest orchestration
  - Akashic progression tracking
  - Deity bonding management
  - Instance persistence

Why Avatar Upload is HERE:
  - Requires user authentication
  - Needs ownership validation
  - Storage quota management
  - Content moderation
  - NOT a presentation concern
```

---

## 🔄 Data Flow Examples (Reality-Based)

### **User Uploads Avatar**
```
1. User selects avatar file in UI
   → User Services API (Port 3012)

2. User Services validates:
   - Authentication check (JWT)
   - File size/type validation (max 10MB GLB)
   - Virus scanning
   - Storage quota check (tier-based limits)

3. Avatar stored in S3/database
   - Ownership recorded
   - Metadata extracted (polygon count, textures)
   - CDN URL generated

4. URL sent to Presentation Layer
   - poqpoq Presentation loads GLB from CDN
   - Renders in scene (Babylon.js)
   - NO upload handling in Presentation
```

---

### **AI Companion Sees and Responds**
```
1. Camera captures scene
   → Cognition API (Port 8004)
   → BLIP processes image (200ms)

2. Vision description + user message
   → Bob GPT (Port 8081)
   → EEMS memory retrieval (2ms FAISS search)
   → Bob-21B creative response generation (1500ms)

3. Response includes commands
   → NEXUS broadcasts (Port 3020, Socket.IO)
   → Presentation executes visuals (#setSky:"sunset")
   → Voice Ninja synthesizes speech (1-3s TTS)

Total response time: <2 seconds
```

---

### **Quest Completion → Akashic Rewards** (NEW v2.2)
```
1. User completes quest (collects final token)
   → NEXUS Socket.IO (quest_completed event)

2. Quest completion triggers rewards
   → POST /nexus/akashic/award
   → Award resonance: 200, wisdom: 50, creativity: 30
   → Database trigger checks rank threshold
   → If rank increases: Update user.akashic_rank

3. Attribute growth (activity-driven)
   → POST /nexus/attributes/award
   → Award attributes based on quest type
   → If deity bonded: Apply blessing amplification

4. Frontend updates
   → HUD displays new essence/rank
   → Character sheet shows updated attributes
   → Visual effects (rank-up animation)
```

---

### **Deity Manifestation (Godstorm Phase 1)** (NEW v2.2)
```
1. Admin triggers Godstorm
   → POST /nexus/admin/godstorm/summon
   → deity_name: 'Artemis', duration_minutes: 10

2. NEXUS orchestrates event
   → Generate speech via Voice Ninja (4 messages)
   → Create database record (godstorm_events)
   → Schedule automatic end (10 min timer)

3. Broadcast to instance
   → Socket.IO: godstorm_started event
   → All users in instance receive event
   → Frontend spawns deity mesh (glowing cube)

4. Deity flies and speaks
   → Steering behaviors (circular flight pattern)
   → Voice Ninja TTS at scheduled times (0s, 3min, 6min, 9min)
   → Frontend displays subtitles

5. Event ends
   → Socket.IO: godstorm_ended event
   → Frontend plays despawn animation
   → Database record updated with duration/stats
```

---

## 🛡️ Security & Validation

### **Layer Separation (Actual Implementation)**

<div align="center">

![Security](https://img.shields.io/badge/Security-Layer_Isolation-red?style=for-the-badge&logo=shield&logoColor=white)
![Auth](https://img.shields.io/badge/Auth-Three_Tier_Policy-orange?style=for-the-badge&logo=key&logoColor=white)
![Validation](https://img.shields.io/badge/Validation-Multi_Point-green?style=for-the-badge&logo=checkmark&logoColor=white)

</div>

```yaml
User Services (3012):
  - Handles ALL user uploads
  - Authentication required (JWT)
  - File validation & virus scanning
  - Quota enforcement (tier-based)
  - Avatar uploads belong HERE
  - Rate limiting per user

Presentation (8002):
  - Only RENDERS avatars
  - Never handles uploads
  - Executes visual commands
  - No file system access
  - No database writes

NEXUS (3020):
  - Game state authority
  - Socket.IO for reliability
  - Player position validation
  - No direct file handling
  - Quest/akashic/deity orchestration
  - Admin-only Godstorm endpoints

Cognition (8004/8081):
  - Maximum creative freedom
  - Vision processing (BLIP)
  - Memory integration (EEMS)
  - Generates safe commands only
  - Cannot execute commands directly
  - Deity autonomous decisions (Phase 2+)
```

---

### **Three-Tier Authentication Policy**

<div align="center">

![Tier 1](https://img.shields.io/badge/Tier_1-Username-green?style=for-the-badge&logo=user&logoColor=white)
![Tier 2](https://img.shields.io/badge/Tier_2-JWT-orange?style=for-the-badge&logo=key&logoColor=white)
![Tier 3](https://img.shields.io/badge/Tier_3-User_ID_Match-red?style=for-the-badge&logo=shield&logoColor=white)

</div>

**Tier 1: Username (Real-time)**
- Use Case: Socket.IO connections, low-security events
- Token Type: Plain username string
- Example: `socket.emit('user_register', { username: 'allen' })`
- Endpoints: Position updates, chat messages, presence

**Tier 2: JWT (Standard API Calls)**
- Use Case: HTTP REST endpoints requiring authentication
- Token Type: JSON Web Token (Bearer)
- Example: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Endpoints: Quest creation, akashic stats, deity bonding

**Tier 3: User ID Match (Ownership Validation)**
- Use Case: Critical account operations
- Validation: JWT user_id must match request userId parameter
- Example: Profile updates, account deletion, payment operations
- Endpoints: /akashic/stats/:userId (must match JWT), /deities/unbond

---

## 🔌 WebSocket Strategy (What Actually Works)

### **Current Implementation**

```javascript
// Client connections that actually work (October 2025):

// 1. NEXUS Game State (Socket.IO - not plain WebSocket!)
import { io } from 'socket.io-client'
const nexusSocket = io('https://poqpoq.com', {  // NEW: Updated domain!
    path: '/nexus/',
    transports: ['websocket', 'polling']
})

// 2. Companion Chat (Plain WebSocket)
const companionWS = new WebSocket('wss://poqpoq.com/ws')

// 3. Perception Stream (Plain WebSocket)
const perceptionWS = new WebSocket('wss://poqpoq.com/ws/perception/')

// 4. Vision Processing (Plain WebSocket)
const visionWS = new WebSocket('wss://poqpoq.com/api/cognition/ws/vision/USER_ID')
```

### **Why This Architecture?**
1. **NEXUS uses Socket.IO**: Better reliability, auto-reconnect, fallback to polling
2. **AI services use plain WebSocket**: Simpler for streaming data
3. **Separate services**: Easier to scale and debug independently
4. **Path-based routing**: Apache handles SSL termination cleanly
5. **Domain-agnostic**: Works with both poqpoq.com and voice-ninja.com (legacy)

---

### **Socket.IO Event Catalog** (20+ events)

<div align="center">

![Real-Time](https://img.shields.io/badge/Events-20+_Types-FFC107?style=for-the-badge&logo=bolt&logoColor=white)
![Multi-User](https://img.shields.io/badge/Sync-100+_Users-4CAF50?style=for-the-badge&logo=users&logoColor=white)

</div>

#### Connection Events
- `user_register` - Register user with NEXUS
- `heartbeat` - Keep-alive ping (30s intervals)
- `disconnect` - Clean disconnect

#### Position & Movement
- `position_update` - Send position (adaptive 5-10s)
- `zone_transition` - User moved zones

#### Quest Events
- `quest_start` - Start quest instance
- `quest_update` - Update progress
- `quest_completed` - Quest finished

#### Godstorm Events (NEW v2.2)
- `godstorm_started` - Deity manifests
- `godstorm_speech` - Deity speaks
- `godstorm_ended` - Deity departs

#### Environment Events
- `environment_change` - Change sky/weather/time
- `environment_updated` - Broadcast to all users

---

## 📋 Current Service Status (October 2025)

### **✅ Production Services (Working)**

<div align="center">

![NEXUS](https://img.shields.io/badge/NEXUS-Active-4CAF50?style=for-the-badge&logo=checkmark&logoColor=white)
![Voice Ninja](https://img.shields.io/badge/Voice_Ninja-Active-4CAF50?style=for-the-badge&logo=checkmark&logoColor=white)
![AI Streams](https://img.shields.io/badge/AI_Streams-Active-4CAF50?style=for-the-badge&logo=checkmark&logoColor=white)
![Bob GPT](https://img.shields.io/badge/Bob_GPT-Active-4CAF50?style=for-the-badge&logo=checkmark&logoColor=white)

</div>

- **NEXUS** (3020): Socket.IO game state, quests, akashic, deities ✅
- **Companion WebSocket** (8002): AI chat on /ws ✅
- **Perception API** (8003): Spatial awareness ✅
- **Cognition API** (8004): Vision processing (BLIP) ✅
- **Bob GPT** (8081): 21B AI companion ✅
- **Voice Ninja** (3011): Voice synthesis (25+ voices) ✅
- **AI Streams** (8005): Unified AI conversation ✅

### **🔄 Planned Services**
- **User Services API** (3012): Avatar uploads, user management
- **Godstorm Phase 2+**: Probabilistic triggers, divine demands, seed systems

---

## 🎯 Success Metrics

### **What We Got Right**

<div align="center">

![Architecture](https://img.shields.io/badge/Architecture-Proven-green?style=for-the-badge&logo=check-circle&logoColor=white)
![Performance](https://img.shields.io/badge/Performance-Sub_2s_Response-green?style=for-the-badge&logo=lightning&logoColor=white)
![Scale](https://img.shields.io/badge/Scale-100+_Users-green?style=for-the-badge&logo=users&logoColor=white)

</div>

- ✅ Separated concerns properly (clean layer boundaries)
- ✅ Socket.IO for game state (better than plain WebSocket)
- ✅ Unified AI Streams reduces complexity
- ✅ BLIP vision integration working (200ms processing)
- ✅ EEMS memory system deployed (2ms retrieval)
- ✅ Quest system with AI generation (2-5s)
- ✅ Akashic progression with auto-rank (database triggers)
- ✅ Multi-user environment sync (real-time broadcast)
- ✅ Token collection system (working October 4)
- ✅ Deity bonding with faith amplification

### **What We Learned**
- ❌ Avatar upload is NOT Presentation (it's User Services)
- ❌ Don't over-engineer port allocation (work with natural clustering)
- ❌ Socket.IO and plain WebSocket serve different needs
- ❌ Documentation should reflect reality, not ideals
- ✅ JSONB flexibility enables rapid iteration (no migrations for quest data)
- ✅ Database triggers reduce API complexity (auto-rank calculation)
- ✅ Migration 003, 004, 005 deployed without issues

### **Good Neighbor Success**
- ✅ Services don't interfere with each other (port isolation)
- ✅ Clear boundaries maintained (layer separation enforced)
- ✅ Each service has single responsibility (microservices pattern)
- ✅ Scalable architecture proven (100+ users tested)
- ✅ New features integrate cleanly (akashic, quests, deities added smoothly)

---

## 🔍 Debugging & Monitoring

### **Service Health Endpoints**

```bash
# All services respond to health checks
curl https://poqpoq.com/health                         # Voice Ninja
curl https://poqpoq.com/world/api/health               # poqpoq World
curl https://poqpoq.com/api/cognition/health           # Cognition
curl https://poqpoq.com/nexus/health                   # NEXUS (public)
curl http://localhost:3020/health                       # NEXUS (local)
curl http://localhost:8002/health                       # Companion

# Service monitoring (production server)
sudo systemctl status nexus                             # NEXUS status (systemd)
sudo journalctl -u nexus -f                            # NEXUS logs (journald)

# Legacy domain still works (backward compatibility)
curl https://voice-ninja.com/nexus/health
```

### **WebSocket Testing**

```bash
# Test Socket.IO (NEXUS)
curl 'https://poqpoq.com/nexus/socket.io/?EIO=4&transport=polling'

# Test WebSocket endpoints
wscat -c wss://poqpoq.com/ws                           # Companion
wscat -c wss://poqpoq.com/ws/perception/               # Perception
wscat -c wss://poqpoq.com/ai-streams/ws/               # AI Streams
```

### **NEXUS Specific Debugging**

```bash
# Check database connection
ssh -i ~/.ssh/voice-ninja.pem ubuntu@poqpoq.com
psql -U nexus_user -d bbworlds_nexus -c "SELECT COUNT(*) FROM users;"

# View recent Godstorm events
psql -U nexus_user -d bbworlds_nexus -c "SELECT * FROM godstorm_events ORDER BY started_at DESC LIMIT 5;"

# Check quest completions today
psql -U nexus_user -d bbworlds_nexus -c "SELECT COUNT(*) FROM challenge_completions WHERE completed_at > NOW() - INTERVAL '1 day';"
```

---

## 📅 Migration & Version History

### **Version Timeline**

<div align="center">

![v1.0](https://img.shields.io/badge/v1.0-Initial_Design-blue?style=for-the-badge)
![v2.0](https://img.shields.io/badge/v2.0-Reality_Check-orange?style=for-the-badge)
![v2.1](https://img.shields.io/badge/v2.1-Quest_System-yellow?style=for-the-badge)
![v2.2](https://img.shields.io/badge/v2.2-Akashic_&_Godstorm-green?style=for-the-badge)

</div>

### **From v2.1 to v2.2 (October 5, 2025)**
1. **Rebranding**: BBWorlds → poqpoq throughout
2. **Domain migration**: voice-ninja.com → poqpoq.com (legacy supported)
3. **Akashic endpoints**: 4 new REST routes (award, stats, leaderboard, transactions)
4. **Deity bonding**: 5 new REST routes (available, details, bond, bonds, unbond)
5. **Godstorm Phase 1**: 3 admin endpoints (summon, events, end)
6. **Instance persistence**: 6 endpoints (personal, objects CRUD, environment, reset)
7. **Documentation enhancement**: Shield.io badges, customer-facing language

### **From v2.0 to v2.1 (October 3, 2025)**
1. **Quest system**: 6 new REST routes
2. **Database migration 003**: Quest tables deployed
3. **Challenge templates**: Bejeweled, coloring, quiz support

### **From v1.0 to v2.0 (August 31, 2025)**
1. **Avatar upload** moved from Presentation to User Services
2. **Port 9001-9003** abandoned in favor of 8002-8005
3. **NEXUS** confirmed as Socket.IO (not plain WebSocket)
4. **Documentation** now reflects actual implementation

### **No Migration Needed**
- Current setup is working well (proven at scale)
- Don't fix what isn't broken
- Document reality, not fantasy

---

## 🎨 AI Creativity Guidelines

### **Maximum Creative Freedom** (Cognition Layer)

<div align="center">

![Creative Freedom](https://img.shields.io/badge/Cognition-Maximum_Freedom-9C27B0?style=for-the-badge&logo=palette&logoColor=white)
![Storytelling](https://img.shields.io/badge/Encouraged-Storytelling-E91E63?style=for-the-badge&logo=book&logoColor=white)

</div>

```yaml
Encouraged:
  - Storytelling and narrative
  - World building suggestions
  - Character personality
  - Artistic decisions
  - Problem-solving approaches
  - Memory formation
  - Deity decision-making (Phase 2+)
  - Quest generation from conversation

Example:
  User: "Make something cool"
  AI: Full creative freedom to design, build, narrate
```

### **Constrained Responses** (Safety)

<div align="center">

![Security](https://img.shields.io/badge/Safety-Constrained_Paths-red?style=for-the-badge&logo=shield&logoColor=white)
![Validation](https://img.shields.io/badge/Validation-Multi_Layer-orange?style=for-the-badge&logo=checkmark&logoColor=white)

</div>

```yaml
Constrained:
  - File uploads (User Services only)
  - Authentication (strict JWT protocols)
  - Resource allocation (prevent abuse)
  - Database writes (no direct SQL)
  - Admin operations (require admin role)

Example:
  User: "Upload my avatar"
  System: Routes to User Services with auth check
```

---

## 🌐 Domain Migration Strategy

### **Current Production Domains (October 2025)**

<div align="center">

![Primary Domain](https://img.shields.io/badge/Primary-poqpoq.com-00D4FF?style=for-the-badge&logo=globe&logoColor=white)
![Legacy Domain](https://img.shields.io/badge/Legacy-voice--ninja.com-607D8B?style=for-the-badge&logo=history&logoColor=white)
![Same Server](https://img.shields.io/badge/Server-Same_Machine-4CAF50?style=for-the-badge&logo=server&logoColor=white)

</div>

- **Primary:** poqpoq.com (use this for all new code)
- **Legacy:** voice-ninja.com (backward compatibility, kept for existing integrations)
- **Server:** 34.220.134.216 (AWS EC2 Ubuntu) - same machine serves both domains

### **URL Migration Path**

**Old Paths (Still Work):**
```
https://voice-ninja.com/world/              → Redirects or serves from /var/www/world/
https://voice-ninja.com/world/cognition/docs → Legacy nested path
https://voice-ninja.com/world/perception/docs → Legacy nested path
https://voice-ninja.com/world/api/docs      → Deprecated path
https://voice-ninja.com/api/docs            → Deprecated Voice Ninja API path
https://voice-ninja.com/nexus               → Works (backward compatible)
```

**New Paths (Use These):**
```
https://poqpoq.com                          → Main frontend
https://poqpoq.com/cognition/docs           → Flat API structure (Swagger docs)
https://poqpoq.com/perception/docs          → Flat API structure (Swagger docs)
https://poqpoq.com/nexus                    → NEXUS multi-user server
https://poqpoq.com/bob-gpt/docs             → AI companion API (Swagger docs)
https://poqpoq.com/bbworlds/docs            → poqpoq World API (Swagger docs)
https://poqpoq.com/ai-streams/docs          → AI Streams API (Swagger docs)
https://poqpoq.com/voice-ninja/docs         → Voice Ninja API (Swagger docs)
```

### **Code Guidelines for Developers**

**✅ DO: Use API_CONFIG from api.config.ts**
```typescript
import { API_CONFIG } from '../config/api.config';

// Automatically handles domain selection
const nexusUrl = API_CONFIG.NEXUS;           // https://poqpoq.com/nexus
const cognitionUrl = API_CONFIG.COGNITION;   // https://poqpoq.com/cognition
const bobGptUrl = API_CONFIG.BOB_GPT;        // https://poqpoq.com/bob-gpt
```

**❌ DON'T: Hardcode domain names**
```typescript
// WRONG - Hardcoded legacy domain
const url = 'https://voice-ninja.com/nexus';

// WRONG - Hardcoded new domain
const url = 'https://poqpoq.com/nexus';

// CORRECT - Use configuration
import { API_CONFIG } from '../config/api.config';
const url = API_CONFIG.NEXUS;
```

---

## 📚 Related Documentation

<div align="center">

![Docs](https://img.shields.io/badge/Documentation-Comprehensive-4CAF50?style=for-the-badge&logo=book&logoColor=white)
![Up to Date](https://img.shields.io/badge/Status-Current-green?style=for-the-badge&logo=calendar&logoColor=white)

</div>

**Essential Reading:**
- 📖 [API Endpoint Reference Guide](/docs/API_ENDPOINT_REFERENCE_GUIDE.md) - 90+ endpoints documented
- 📊 [Implementation Status Dashboard](/docs/IMPLEMENTATION_STATUS_DASHBOARD.md) - What's deployed vs designed
- 🗄️ [Database Good Neighbor Policy](/docs/infra/services/DATABASE_GOOD_NEIGHBOR_POLICY_2025-10-03.md) - Database architecture
- 🗺️ [AI Architecture Master Index](/docs/ai-architecture/AI-ARCHITECTURE-MASTER-INDEX.md) - 20+ chapters
- 🌩️ [Godstorm Phase 1 Technical Spec](/docs/ai-architecture/GODSTORM_PHASE1_TECHNICAL_SPECIFICATION.md) - Divine manifestations

**Quick Links:**
- 🎯 [Voice Ninja Swagger Docs](https://poqpoq.com/voice-ninja/docs)
- 🧠 [AI Streams Swagger Docs](https://poqpoq.com/ai-streams/docs)
- 🎮 [Cognition Swagger Docs](https://poqpoq.com/cognition/docs)
- 👁️ [Perception Swagger Docs](https://poqpoq.com/perception/docs)
- 🤖 [Bob GPT Swagger Docs](https://poqpoq.com/bob-gpt/docs)
- 🌐 [Main Website](https://poqpoq.com)

---

## 🎉 Conclusion

<div align="center">

![Production Ready](https://img.shields.io/badge/Status-Production_Deployed-4CAF50?style=for-the-badge&logo=rocket&logoColor=white)
![Scalable](https://img.shields.io/badge/Architecture-Proven_at_Scale-00BCD4?style=for-the-badge&logo=trending-up&logoColor=white)
![Customer Ready](https://img.shields.io/badge/Documentation-Customer_Ready-FFC107?style=for-the-badge&logo=book&logoColor=white)

</div>

**This Good Neighbor Policy v2.2 reflects the actual deployed architecture that successfully serves poqpoq in production.**

### Key Achievements (October 2025)
- ✅ 100+ concurrent users supported (NEXUS)
- ✅ <2s total AI response time (memory → generation → TTS)
- ✅ 30+ NEXUS REST endpoints operational
- ✅ Quest system with AI generation working
- ✅ Akashic progression with auto-rank calculation
- ✅ Deity bonding with faith amplification
- ✅ Token collection system integrated
- ✅ Godstorm Phase 1 ready for deployment
- ✅ Multi-user environment sync (real-time)
- ✅ Production rebrand to poqpoq complete

### Design Principles
1. **Reality over theory** - Document what's actually deployed
2. **Work with infrastructure** - Don't fight natural clustering
3. **Layer separation** - Clear boundaries, single responsibility
4. **Scale from day one** - Architecture supports 100+ users
5. **Iterate rapidly** - JSONB flexibility enables fast features

---

<div align="center">

## 🌟 Welcome to poqpoq - The AI-First Metaverse 🌟

![Built with Love](https://img.shields.io/badge/Built_with-❤️-red?style=for-the-badge)
![poqpoq Team](https://img.shields.io/badge/by-poqpoq_team-00D4FF?style=for-the-badge&logo=team&logoColor=white)
![Powered by Claude](https://img.shields.io/badge/Powered_by-Claude_Code_🤖-7B68EE?style=for-the-badge&logo=anthropic&logoColor=white)

</div>

---

*Last Updated: October 5, 2025*
*Version: 2.2 - Akashic & Godstorm Integration*
*Implementation Status: Deployed and Operational*
*Key Learning: Reality beats theory every time*
