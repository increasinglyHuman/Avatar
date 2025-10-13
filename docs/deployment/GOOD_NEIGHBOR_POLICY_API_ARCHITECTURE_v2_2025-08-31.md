# Good Neighbor Policy: API Architecture & Port Allocation v2.1

**Version 2.1 - Quest System Integration**
**Date**: October 3, 2025 (Updated from v2.0 - August 31, 2025)
**Context**: BBWorlds Three-Layer Architecture - As Actually Implemented

**v2.1 Changes:**
- Added NEXUS quest creation endpoints (6 new REST routes)
- Quest system database migration 003 deployed
- Updated port allocation matrix with quest API details

---

## 📝 Version 2.0 Change Log

### Why This Update?
During implementation (Aug 27-31, 2025), we discovered that theoretical architecture often needs adjustment when meeting reality. This document now reflects what's **actually deployed and working** rather than what was initially planned.

### Key Learning: "Deploy First, Perfect Later"
- Original plan had WebSockets on ports 9001-9003
- Reality: Services naturally clustered around 8002-8005
- Lesson: Use available infrastructure rather than forcing idealistic designs

### Major Corrections:
1. **Avatar uploads** moved to User Services (not Presentation) - user ownership requires auth
2. **WebSocket consolidation** - Unified AI Streams handles multiple AI concerns
3. **NEXUS uses Socket.IO** - Better for game state management than plain WebSocket
4. **Companion Chat** stays separate - Direct user interaction needs dedicated service

---

## 🏗️ Service Architecture Overview

Following the BBWorlds Three-Layer Architecture with **practical adjustments based on deployment reality**.

---

## 📊 Port Allocation Matrix (ACTUAL)

### HTTP Services
| Service | Port | Protocol | Purpose | Layer | Status |
|---------|------|----------|---------|--------|--------|
| **Voice Ninja API** | 3011 | HTTPS/HTTP | Voice synthesis & phoneme data | Presentation | ✅ Active |
| **User Services API** | 3012 | HTTPS/HTTP | Auth, **avatar uploads**, inventory | Infrastructure | 🔄 Planned |
| **BBWorlds Presentation API** | 8002 | HTTPS/HTTP | World rendering, animations | Presentation | ✅ Active |
| **BBWorlds Perception API** | 8003 | HTTPS/HTTP | Spatial awareness, environment | Perception | ✅ Active |
| **BBWorlds Cognition API** | 8004 | HTTPS/HTTP | Vision processing, BLIP integration | Cognition | ✅ Active |
| **Unified AI Streams** | 8005 | HTTPS/HTTP | Consolidated AI services | All AI Layers | ✅ Active |
| **Bob GPT API** | 8081 | HTTPS/HTTP | Bob AI companion (HTTP only) | Cognition | ✅ Active |
| **Chatterbox TTS** | 8080 | HTTP | Voice synthesis engine (internal) | Presentation | ✅ Active |
| **NEXUS Server** | 3020 | HTTP/Socket.IO | Game state, networking, **quest system** | Infrastructure | ✅ Active |

**NEW NEXUS Quest Endpoints (Oct 2025):**
- `POST /nexus/quests/create` - Create quest from AI conversation
- `GET /nexus/quests/list?category=X&difficulty=Y` - Browse quests
- `GET /nexus/quests/:questId` - Quest details
- `GET /nexus/quests/:questId/leaderboard?period=global|weekly|daily` - High scores
- `GET /nexus/templates/list?category=X` - Challenge templates (Bejeweled, coloring, quiz)
- `GET /nexus/users/:userId/resources` - Check akashic resources (resonance, wisdom, creativity)

### WebSocket Services (Real-time Communication)
| Service | Port | Path | Protocol | Purpose | Status |
|---------|------|------|----------|---------|--------|
| **Companion WebSocket** | 8002 | /ws | Plain WS | AI companion chat | ✅ Active |
| **Perception Stream** | 8003 | /ws/perception/ | Plain WS | Spatial awareness stream | ✅ Active |
| **Cognition Vision** | 8004 | /api/cognition/ws/ | Plain WS | Camera vision processing | ✅ Active |
| **Unified AI Streams** | 8005 | /ai-streams/ws/ | Plain WS | Combined AI services | ✅ Active |
| **NEXUS Game State** | 3020 | /nexus/ | Socket.IO | Player sync & world state | ✅ Active (systemd) |

### Why These Ports?
- **8002-8005**: Natural clustering of AI services
- **3020**: NEXUS needed separation from AI services
- **3011-3012**: User-facing services on 3000 range
- **Lesson**: Don't fight your infrastructure - work with it

---

## 🎯 Three-Layer Architecture (As Implemented)

### **PRESENTATION LAYER**
```yaml
Purpose: Render and display the world
Services:
  - BBWorlds Presentation API (8002): Basic endpoints
  - Voice Ninja API (3011): Voice synthesis
  - Chatterbox TTS (8080): Internal voice engine
  
Responsibilities:
  - Render avatars (NOT upload them)
  - Display animations
  - Execute visual commands
  - Spatial audio playback
  
What it DOESN'T do:
  - Store avatars (that's User Services)
  - Make creative decisions (that's Cognition)
  - Track spatial awareness (that's Perception)
```

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
  
Key Innovation:
  - Adaptive perception rates based on activity
  - Deduplication to reduce noise
  - Integration with memory system
```

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
  
Maximum Freedom For:
  - Narrative generation
  - Character personality
  - World-building suggestions
  - Problem-solving approaches
```

### **INFRASTRUCTURE LAYER**
```yaml
Purpose: Core services and user management
Services:
  - NEXUS (3020): Game state networking
  - User Services (3012): Authentication & user data
  - Database: PostgreSQL for persistence
  
Key Responsibilities:
  - User authentication (via poqpoq_pg)
  - Avatar upload and storage (User Services)
  - Game state synchronization (NEXUS)
  - Session management
  
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
   - Authentication check
   - File size/type validation
   - Virus scanning
   - Storage quota check

3. Avatar stored in S3/database
   - Ownership recorded
   - Metadata extracted
   - CDN URL generated

4. URL sent to Presentation Layer
   - BBWorlds loads GLB from CDN
   - Renders in scene
   - NO upload handling in Presentation
```

### **AI Companion Sees and Responds**
```
1. Camera captures scene
   → Cognition API (Port 8004)
   → BLIP processes image

2. Vision description + user message
   → Bob GPT (Port 8081)
   → EEMS memory retrieval
   → Creative response generation

3. Response includes commands
   → NEXUS broadcasts (Port 3020)
   → Presentation executes visuals
   → Voice Ninja synthesizes speech
```

---

## 🛡️ Security & Validation

### **Layer Separation (Actual Implementation)**
```yaml
User Services (3012):
  - Handles ALL user uploads
  - Authentication required
  - File validation & scanning
  - Quota enforcement
  - Avatar uploads belong HERE

Presentation (8002):
  - Only RENDERS avatars
  - Never handles uploads
  - Executes visual commands
  - No file system access

NEXUS (3020):
  - Game state authority
  - Socket.IO for reliability
  - Player position validation
  - No direct file handling

Cognition (8004/8081):
  - Maximum creative freedom
  - Vision processing (BLIP)
  - Memory integration (EEMS)
  - Generates safe commands only
```

---

## 🔌 WebSocket Strategy (What Actually Works)

### **Current Implementation**
```javascript
// Client connections that actually work:

// 1. NEXUS Game State (Socket.IO - not plain WebSocket!)
import { io } from 'socket.io-client'
const nexusSocket = io('https://voice-ninja.com', {
    path: '/nexus/',
    transports: ['websocket', 'polling']
})

// 2. Companion Chat (Plain WebSocket)
const companionWS = new WebSocket('wss://voice-ninja.com/ws')

// 3. Perception Stream (Plain WebSocket)
const perceptionWS = new WebSocket('wss://voice-ninja.com/ws/perception/')

// 4. Vision Processing (Plain WebSocket)
const visionWS = new WebSocket('wss://voice-ninja.com/api/cognition/ws/vision/USER_ID')
```

### **Why This Architecture?**
1. **NEXUS uses Socket.IO**: Better reliability, auto-reconnect, fallback to polling
2. **AI services use plain WebSocket**: Simpler for streaming data
3. **Separate services**: Easier to scale and debug independently
4. **Path-based routing**: Apache handles SSL termination cleanly

---

## 📋 Current Service Status

### **✅ Working Services**
- **NEXUS** (3020): Socket.IO game state ✅
- **Companion WebSocket** (8002): AI chat on /ws ✅
- **Perception API** (8003): Spatial awareness ✅
- **Cognition API** (8004): Vision processing ✅
- **Bob GPT** (8081): 21B AI companion ✅
- **Voice Ninja** (3011): Voice synthesis ✅

### **🔄 Planned Services**
- **User Services API** (3012): Avatar uploads, user management
- **World Updates WebSocket**: Visual command stream
- **User Presence WebSocket**: Friends and social

---

## 🎯 Success Metrics

### **What We Got Right**
- ✅ Separated concerns properly (mostly)
- ✅ Socket.IO for game state (better than plain WS)
- ✅ Unified AI Streams reduces complexity
- ✅ BLIP vision integration working
- ✅ EEMS memory system deployed

### **What We Learned**
- ❌ Avatar upload is NOT Presentation (it's User Services)
- ❌ Don't over-engineer port allocation
- ❌ Socket.IO and plain WebSocket serve different needs
- ❌ Documentation should reflect reality, not ideals

### **Good Neighbor Success**
- ✅ Services don't interfere with each other
- ✅ Clear boundaries maintained
- ✅ Each service has single responsibility
- ✅ Scalable architecture proven

---

## 🔍 Debugging & Monitoring

### **Service Health Endpoints**
```bash
# All services respond to health checks
curl https://voice-ninja.com/health                    # Voice Ninja
curl https://voice-ninja.com/world/api/health          # BBWorlds
curl https://voice-ninja.com/api/cognition/health      # Cognition
curl http://localhost:3020/health                      # NEXUS
curl http://localhost:8002/health                      # Companion

# Service monitoring
sudo systemctl status nexus                            # NEXUS status (systemd)
sudo journalctl -u nexus -f                           # NEXUS logs (journald)
```

### **WebSocket Testing**
```bash
# Test Socket.IO (NEXUS)
curl 'https://voice-ninja.com/nexus/socket.io/?EIO=4&transport=polling'

# Test WebSocket endpoints
wscat -c wss://voice-ninja.com/ws                     # Companion
wscat -c wss://voice-ninja.com/ws/perception/         # Perception
```

---

## 📅 Migration Notes

### **From v1.0 to v2.0**
1. **Avatar upload** moved from Presentation to User Services
2. **Port 9001-9003** abandoned in favor of 8002-8005
3. **NEXUS** confirmed as Socket.IO (not plain WebSocket)
4. **Documentation** now reflects actual implementation

### **No Migration Needed**
- Current setup is working well
- Don't fix what isn't broken
- Document reality, not fantasy

---

## 🎨 AI Creativity Guidelines (Unchanged)

### **Maximum Creative Freedom** (Cognition Layer)
```yaml
Encouraged:
  - Storytelling and narrative
  - World building suggestions
  - Character personality
  - Artistic decisions
  - Problem-solving approaches
  - Memory formation
  
Example:
  User: "Make something cool"
  AI: Full creative freedom to design, build, narrate
```

### **Constrained Responses** (Safety)
```yaml
Constrained:
  - File uploads (User Services only)
  - Authentication (strict protocols)
  - Resource allocation (prevent abuse)
  
Example:
  User: "Upload my avatar"
  System: Routes to User Services with auth check
```

---

**This Good Neighbor Policy v2.0 reflects the actual deployed architecture that successfully serves BBWorlds in production.**

*Last Updated: August 31, 2025*  
*Implementation Status: Deployed and Operational*
*Key Learning: Reality beats theory every time*