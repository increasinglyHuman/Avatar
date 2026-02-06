# poqpoq World Project Context

**For:** BlackBox Avatar integration team
**Date:** 2026-02-06
**Author:** Allen Partridge (p0qp0q / increasinglyHuman)

---

## 🌍 What is poqpoq World?

**poqpoq World** (formerly BBWorlds) is an AI-first metaverse platform built to break the 20-year 100-user barrier in virtual worlds.

**Live URL:** https://poqpoq.com/world/
**GitHub:** https://github.com/increasinglyHuman/World
**Status:** Production deployed, active alpha testing

---

## 🏗️ Technical Architecture

### **Frontend Stack:**
- **Engine:** Babylon.js v8.49.3 (WebGPU + WebGL2 fallback)
- **Language:** TypeScript (strict mode)
- **Build:** Vite v7.1.3
- **Format:** GLB/GLTF for all 3D assets

### **Backend Services:**
- **NEXUS** (Port 3020) - Multi-user networking (Socket.IO + PostgreSQL)
- **Voice Ninja** - AI companion voice/personality
- **Cognition** - AI decision-making
- **Perception** - Visual/spatial awareness
- **AI Streams** - Real-time AI communication

### **Database:**
- PostgreSQL 16.9
- Database: `bbworlds_nexus`
- 23+ tables for users, instances, quests, avatars, etc.

---

## 🎭 Avatar System (Why You're Here!)

### **Current State:**
- ❌ Ready Player Me **SHUT DOWN** (Netflix acquisition, Jan 31 2026)
- ❌ RPM API returning 404 errors
- ❌ Users stuck without avatar creation

### **Previous Flow:**
1. User logs in with Google OAuth
2. Backend creates user in `bbworlds_nexus.users` table
3. RPM iframe opens for avatar creation
4. Avatar saved to `avatar_url` field
5. BBWorlds loads GLB from URL

### **New Solution (Your Mission!):**
**BlackBox Avatar** (CharacterStudio fork) replaces RPM with:
- Web-based VRM avatar creator
- GLB/VRM export
- Integration with World authentication
- VTuber crossover potential (VRM format)

---

## 🔐 Authentication System (CRITICAL!)

### **OAuth Flow:**
1. User clicks Google sign-in
2. POST to: `https://poqpoq.com/voice-ninja/auth/google`
3. Backend returns:
   ```json
   {
     "success": true,
     "user_id": "uuid-here",  // ← This is the canonical user ID
     "jwt_token": "...",
     "user": { email, display_name, avatar_url }
   }
   ```
4. Stored in localStorage as `auth_user` and `auth_token`

### **Database Schema:**
```sql
-- Table: bbworlds_nexus.users
SELECT
    id,              -- UUID (canonical user identity)
    username,        -- Usually email
    email,           -- From Google OAuth
    display_name,    -- Friendly name
    avatar_url,      -- ← WHERE YOUR AVATARS GO!
    oauth_provider,  -- 'google'
    oauth_id         -- Google sub
FROM users;
```

### **CRITICAL: User ID vs Session ID**
- **User ID** (`users.id`) = Persistent UUID from OAuth (use for avatar_url!)
- **Session ID** = Temporary per-tab WebSocket connection (ignore for avatars)

**Always use `user.id` for avatar operations!**

---

## 🔧 Integration Points for BlackBox Avatar

### **What World Needs from Avatar:**

**1. Avatar Creation Flow:**
```javascript
// User completes avatar in BlackBox Avatar
const avatarData = {
    userId: currentUser.id,  // From World auth
    vrmUrl: "https://poqpoq.com/avatars/{userId}.vrm",
    glbUrl: "https://poqpoq.com/avatars/{userId}.glb"
};

// Save to database
PATCH /nexus/users/{userId}
Body: { avatar_url: glbUrl }
```

**2. Avatar Loading in World:**
```javascript
// BBWorlds loads avatar (src/avatars/RPMAvatarLoader.ts)
const avatarUrl = currentUser.avatar_url;
const result = await SceneLoader.ImportMeshAsync("", avatarUrl);
// Apply to player character
```

**3. Alpha Phase (Simple!):**
- Option 1: Upload VRM → Convert to GLB → Upload to S3
- Option 2: Choose default-a.glb
- Option 3: Choose default-b.glb

---

## 📡 API Endpoints You'll Use

**Base URL:** `https://poqpoq.com`

### **Authentication:**
```
GET  /voice-ninja/auth/status          # Check if logged in
POST /voice-ninja/auth/google          # OAuth login
```

### **User Management:**
```
GET   /nexus/users/{userId}            # Get user profile
PATCH /nexus/users/{userId}            # Update avatar_url
GET   /nexus/users/{userId}/avatar-status  # Check if avatar exists
```

### **File Upload (TODO):**
```
POST /nexus/avatars/upload             # Upload VRM/GLB
Response: { url: "https://poqpoq.com/avatars/{userId}.glb" }
```

---

## 🎨 BlackBox Creative Suite Integration

All BlackBox tools share:
- **Same auth system** (Google OAuth via Voice Ninja backend)
- **Same user ID** (bbworlds_nexus.users.id)
- **Same S3 storage** (poqpoq.com domain)
- **Same design language** (professional, dark theme, GLB-centric)

**Sister Tools:**
1. **Animator** - `/home/p0qp0q/blackbox/blackBoxIKAnimator/`
2. **Skinner** - Deployed at poqpoq.com/skinner/
3. **Terraformer** - Deployed at poqpoq.com/terraformer/
4. **World** - `/home/p0qp0q/blackbox/World/` (main platform)

**Check Animator's auth integration** for reference patterns!

---

## 🚨 Recent Fixes (Context for Today's Work)

### **Authentication Bug (Fixed 2026-02-06):**
- **Problem:** Client sent display names to NEXUS, created orphan users
- **Fix:** Now sends OAuth UUID, NEXUS looks up by ID
- **Files changed:** `src/main.ts`, `nexus-server/core/UserManager.js`

### **Multi-User Sync Working:**
- NEXUS registers users correctly
- Position updates flowing
- Remote players visible
- **Test with:** Lily (alpha tester)

---

## 📋 Avatar Integration Checklist

**Phase 1 - Minimum Viable (This Week):**
- [ ] Create 2 default VRM avatars (A, B)
- [ ] Export as VRM → Rename to GLB
- [ ] Upload to S3: `poqpoq.com/avatars/default-a.glb`
- [ ] Add VRM upload UI to World
- [ ] Test loading in Babylon.js

**Phase 2 - Full Integration (Next Week):**
- [ ] Fork CharacterStudio with BlackBox branding
- [ ] Add World authentication
- [ ] Direct S3 upload (skip file download)
- [ ] Deploy at poqpoq.com/avatar/
- [ ] Test with alpha users

**Phase 3 - Polish (Future):**
- [ ] Custom asset packs (non-anime styles?)
- [ ] Animation preview in creator
- [ ] VTuber SDK integration
- [ ] API for third-party avatar tools

---

## 🎯 Key Files in World Repo

**Avatar Loading:**
- `src/avatars/RPMAvatarLoader.ts` - Main avatar loader (needs VRM support!)
- `src/ui/LoadingScreen.ts` - Avatar creation prompt
- `src/auth/AuthenticationManager.ts` - User auth and ID management

**Configuration:**
- `src/config/api.config.ts` - API endpoints
- `.env` - Environment variables (API keys, domains)

**Database:**
- Schema: `bbworlds_nexus.users` table
- Field: `avatar_url` (TEXT) - Store GLB/VRM URL here

---

## 💾 S3 Storage Structure

**Bucket:** `blackboxworlds-assets` (or similar)
**Avatar Path:** `/avatars/{userId}.glb` or `/avatars/{userId}.vrm`

**Default Avatars:**
- `/avatars/default-a.glb` (Female preset)
- `/avatars/default-b.glb` (Male preset)

**User Avatars:**
- `/avatars/5c21ae0f-81f9-4bb6-bcde-a52228ae8c4b.glb`

---

## 🐛 Known Issues

**Current Blockers:**
1. **RPM Dead** - Need new avatar solution (you!)
2. **VRM Support** - Babylon.js needs VRM loader or VRM→GLB converter
3. **File Upload** - Need avatar upload endpoint in NEXUS

**Working:**
- ✅ Authentication (Google OAuth)
- ✅ Multi-user networking (NEXUS)
- ✅ Terrain loading (BBT format)
- ✅ GLB asset loading (characters, buildings, props)

---

## 🎮 Testing with Lily

**Alpha Tester:** Lily Partridge (lily.partridge.0607@gmail.com)
**User ID:** `ffd50299-bf4c-47d5-8e2c-4729bac47c18`
**Current Issue:** Can't create avatar (RPM dead)

**Test Plan:**
1. Create simple avatar picker UI
2. Let Lily choose default A or B
3. Load GLB in forest instance
4. Verify position updates work
5. Verify multi-user sync (see each other's avatars)

---

## 📚 Documentation to Read

**Architecture:**
- `/docs/AUTH_FLOW_ANALYSIS.md` - Auth flow we just fixed
- `/docs/ai-architecture/chapter-11-nexus-architecture-overview.md` - Multi-user system
- `/docs/infra/CODE_STANDARDS.md` - Coding patterns

**Deployment:**
- `CLAUDE.md` - Deployment guide and server access
- `/docs/infra/NEXUS_DEPLOYMENT_GUIDE.md` - NEXUS server management

---

## 🚀 Deployment Info

**Production Server:** poqpoq.com (34.220.134.216)
**SSH:** `ssh -i ~/.ssh/poqpoq-new.pem ubuntu@poqpoq.com`
**Web Root:** `/var/www/world/` (World frontend)
**NEXUS:** `/home/ubuntu/bbworlds-nexus/` (Backend service)

**Build Command:**
```bash
# ALWAYS use npm run build (sets production env vars!)
npm run build  # NOT: npx vite build

# Deploy
rsync -avz -e "ssh -i ~/.ssh/poqpoq-new.pem" ./dist/ ubuntu@poqpoq.com:/var/www/world/
```

---

## 🎯 Your Mission

**Immediate Goal:**
Replace RPM with BlackBox Avatar to unblock alpha testing.

**Simple Alpha Flow:**
1. User logs in → No avatar
2. Show 3 options: Upload VRM, Default A, Default B
3. Save choice to `users.avatar_url`
4. Load GLB in Babylon.js
5. User enters world with avatar

**Long-term Goal:**
Full web-based avatar customization integrated with World, deployed at poqpoq.com/avatar/ as part of the BlackBox Creative Suite.

---

## 🤝 Collaboration

**World Lead:** Allen Partridge (p0qp0q)
**Avatar Team:** You (working in BlackBoxAvatar repo)
**Communication:** Changes to auth, database schema, or API contracts need coordination

**When to sync:**
- Authentication changes
- Database schema changes
- New API endpoints
- File upload workflows
- Avatar format decisions (VRM vs GLB)

---

## 📞 Quick Reference

**Auth Manager:** `src/auth/AuthenticationManager.ts`
```typescript
const user = authManager.getCurrentUser();
// user.id = UUID (use this for avatar_url!)
// user.email = Email
// user.name = Display name
```

**API Config:** `src/config/api.config.ts`
```typescript
API_CONFIG.NEXUS = "https://poqpoq.com/nexus"
API_CONFIG.AUTH.GOOGLE = "https://poqpoq.com/voice-ninja/auth/google"
```

**Avatar Loading:** `src/avatars/RPMAvatarLoader.ts`
```typescript
async loadAvatar(url: string): Promise<Mesh> {
    // Add VRM support here!
}
```

---

## ✨ Today's Wins

**Fixed Authentication:**
- Client now sends OAuth UUIDs to NEXUS ✅
- Server looks up users by ID (not name) ✅
- No more orphan user records ✅
- Position updates working ✅

**Avatar Strategy Set:**
- CharacterStudio fork complete ✅
- MIT licensed ✅
- Repository ready ✅
- 3-option alpha plan defined ✅

---

## 🎭 VTuber Crossover Opportunity

**Why VRM Format Matters:**
- VRM = Standard for VTubing software
- Users can use **same avatar** for:
  - poqpoq World (gameplay)
  - Streaming (VTuber software)
  - VRChat (social VR)
  - Other VRM platforms

**Marketing angle:** "Create once, use everywhere!"

---

## 🔮 Vision

poqpoq World isn't just another metaverse - it's solving virtual worlds' biggest problem: dead spaces and low player counts.

**The Innovation:**
- 9-zone spatial system (O(k×n) not O(n²))
- AI companions with personality (Voice Ninja)
- Emotional memory systems (Akashic records)
- VTuber-compatible avatars (your mission!)
- 100+ concurrent users (the goal)

---

## 📖 For More Context

**Read these in World repo:**
- `/docs/AUTH_FLOW_ANALYSIS.md` - Authentication architecture (today's work)
- `CLAUDE.md` - Project overview and deployment
- `/docs/ai-architecture/chapter-11-nexus-architecture-overview.md` - Multi-user system

**Check sister repos:**
- `/home/p0qp0q/blackbox/blackBoxIKAnimator/` - See proven BlackBox architecture pattern

---

**Good luck with the Avatar integration!** 🚀

Questions? Allen is at p0qp0q@poqpoq.com or check the main World repo.
