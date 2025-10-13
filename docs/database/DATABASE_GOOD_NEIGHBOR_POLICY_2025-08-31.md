# Good Neighbor Policy: Database Architecture & Allocation

**Version 1.1 - Complete Database Separation & Purpose Documentation**  
**Date**: August 31, 2025 (Updated September 4, 2025 with correct password)  
**Context**: BBWorlds Multi-Service Database Architecture

---

## 🗄️ Database Architecture Overview

Following the BBWorlds microservices architecture, we maintain separate databases for distinct purposes with clear boundaries and dedicated authentication for scalable, secure operation.

---

## 📊 Database Allocation Matrix

### PostgreSQL Databases

#### voice-ninja.com Server (Port 5432)
| Database | Owner/User | Password | Purpose | Service Using | Status |
|----------|------------|----------|---------|---------------|--------|
| **voice_ninja** | voice_ninja_user | nWTxGw7Jjjij81fmoFYOLVfK5rn6EDtVhIBz25ZsCs8= | AI Memory & Embeddings | Bob GPT (8081) | ✅ Active |
| **bbworlds_nexus** | nexus_user | nexus_secure_2025 | Game State & Players | NEXUS (3020) | ❌ Needs Creation |
| **bbworlds_world** | world_user | world_secure_2025 | World Assets & Spaces | BBWorlds API (8002) | 🔄 Planned |

#### poqpoq.com Server (Port 5432) - External Authentication
| Database | Owner/User | Server | Purpose | Service Using | Status |
|----------|------------|--------|---------|---------------|--------|
| **poqpoq_pg** | pg_user | poqpoq.com | User Auth & Payments | Payment Gateway | ✅ Active |

**Note**: Authentication is handled by the poqpoq Payment Gateway on a separate server (poqpoq.com), providing unified login across all BBWorlds services.

---

## 🎯 Database Purpose & Schema

### **voice_ninja Database** (AI Memory System)
```yaml
Purpose: Companion memory, embeddings, and relationships
Status: ACTIVE - In Production
Service: Bob GPT with EEMS (Port 8081)
Tables:
  - companion_memories: Embedded conversation history
  - companion_relationships: User-companion relationship tracking
  - memory_access_patterns: Query optimization data
  - compression_analytics: Memory compression statistics
  - memory_tier_config: Hot/warm/cold tier configuration
  - pca_models: Dimensionality reduction models
  - pq_models: Product quantization for vector search
  - avatar_agents: AI companion configurations
  - schema_metadata: Database version tracking
Security: Read/write for Bob GPT, read-only for analytics
```

### **bbworlds_nexus Database** (Game State Management)
```yaml
Purpose: Real-time player state, instances, and networking
Status: NEEDS CREATION
Service: NEXUS Server (Port 3020)
Tables:
  - users: Core user accounts
  - user_states: Real-time position/rotation
  - instances: Personal and communal spaces
  - instance_visitors: Who's in which space
  - events: Game event history
  - session_analytics: Player behavior tracking
  - user_profiles: Extended user information
  - user_characters: Avatar selections
  - user_inventories: Virtual items
  - friendships: Social connections
  - blocks: User blocking system
  - maturity_settings: Content filtering
  - oauth_accounts: External authentication
Security: High-frequency writes, optimized for real-time
```

### **poqpoq_pg Database** (Authentication & Payment Gateway)
```yaml
Purpose: Unified user authentication, OAuth, payments
Status: ACTIVE - External Service
Server: poqpoq.com
Service: poqpoq Payment Gateway
Features:
  - User registration and login
  - OAuth providers (Gmail, Discord, etc.)
  - Payment processing (Stripe, PayPal)
  - Subscription management
  - API key authentication
  - Rate limiting and quotas
  - Audit trails
Security: 
  - Hosted on separate server for isolation
  - PCI compliant for payment processing
  - OAuth2 token management
  - JWT tokens for session management
Integration:
  - BBWorlds services authenticate via API calls to poqpoq.com
  - Single sign-on (SSO) across all services
  - Webhooks for user events
```

### **bbworlds_world Database** (Virtual World Assets)
```yaml
Purpose: 3D assets, builds, user-generated content
Status: PLANNED
Service: BBWorlds Presentation API (Port 8002)
Tables:
  - assets: GLB models, textures
  - user_builds: Created structures
  - world_templates: Starter worlds
  - asset_metadata: Descriptions, tags
  - asset_permissions: Sharing settings
  - terrain_configs: Procedural settings
Security: Large binary storage, CDN integration
```

---

## 🔄 Database Interaction Patterns

### **Memory Flow (Bob's Brain)**
```
User Chat → Cognition API → voice_ninja DB → EEMS Processing
                ↓
        Bob GPT Response ← Embedded Memory Retrieval
```

### **Game State Flow (Real-time Updates)**
```
Player Movement → NEXUS → bbworlds_nexus DB
                    ↓
            WebSocket Broadcast → All Connected Players
```

### **Authentication Flow (External)**
```
Login Request → BBWorlds → poqpoq.com Payment Gateway
                    ↓
            poqpoq_pg DB (User Validation)
                    ↓
            JWT Token → Client → All API Requests
```

### **Asset Flow**
```
Upload GLB → Presentation API → bbworlds_world DB → S3/CDN
                    ↓
            Asset URL → Game Client → Babylon.js Load
```

---

## 🛡️ Security & Isolation Strategy

### **Database Isolation**
```yaml
voice_ninja:
  - Isolated from game state for security
  - Contains sensitive conversation history
  - Backed up daily with encryption
  - No direct client access

bbworlds_nexus:
  - High-frequency writes optimized
  - Eventually consistent for scalability
  - Real-time replication ready
  - WebSocket updates only

poqpoq_pg (External):
  - Separate server isolation
  - PCI DSS compliant
  - OAuth token rotation
  - Rate limiting per user
  - Audit log retention 90 days
  - Payment tokenization

bbworlds_world:
  - CDN for asset delivery
  - Virus scanning on uploads
  - Version control for builds
  - Soft deletes only
```

### **Connection Pooling**
```yaml
Per Service Limits (voice-ninja.com):
  - Bob GPT: 10 connections (memory queries)
  - NEXUS: 50 connections (real-time updates)
  - World: 30 connections (asset uploads)
  - Reserved: 20 for maintenance
  
Total PostgreSQL: max_connections = 150
Auth handled externally via poqpoq.com API
```

---

## 🔧 Database Management Commands

### **Create Missing Databases**
```bash
# Create NEXUS database
sudo -u postgres psql << EOF
CREATE DATABASE bbworlds_nexus;
CREATE USER nexus_user WITH PASSWORD 'nexus_secure_2025';
GRANT ALL PRIVILEGES ON DATABASE bbworlds_nexus TO nexus_user;
\c bbworlds_nexus
GRANT ALL ON SCHEMA public TO nexus_user;
EOF

# Authentication handled by external poqpoq_pg database on poqpoq.com
# No local auth database needed - uses API calls to Payment Gateway

# Future: Create World database
sudo -u postgres psql << EOF
CREATE DATABASE bbworlds_world;
CREATE USER world_user WITH PASSWORD 'world_secure_2025';
GRANT ALL PRIVILEGES ON DATABASE bbworlds_world TO world_user;
EOF
```

### **Apply Schemas**
```bash
# NEXUS schema (23 tables)
sudo -u postgres psql -d bbworlds_nexus < /path/to/nexus/schema_v2_enhanced.sql

# Grant ownership
sudo -u postgres psql -d bbworlds_nexus -c "ALTER SCHEMA public OWNER TO nexus_user;"
```

### **Health Checks**
```bash
# Check all databases
sudo -u postgres psql -c "\l"

# Check specific database size
sudo -u postgres psql -c "SELECT pg_database_size('voice_ninja');"

# Check active connections
sudo -u postgres psql -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Check table sizes in voice_ninja
sudo -u postgres psql -d voice_ninja -c "\dt+"
```

---

## 📋 Environment Variable Template

### **NEXUS Server (.env)**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bbworlds_nexus
DB_USER=nexus_user
DB_PASSWORD=nexus_secure_2025

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### **Bob GPT Server (hardcoded config)**
```python
DATABASE_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "voice_ninja",
    "user": "voice_ninja_user",
    "password": "voice_ninja_secure_2025"
}
```

### **Future Services Template**
```env
# Auth Service
AUTH_DB_URL=postgresql://auth_user:auth_secure_2025@localhost:5432/bbworlds_auth

# World Service
WORLD_DB_URL=postgresql://world_user:world_secure_2025@localhost:5432/bbworlds_world
```

---

## 🚨 Critical Warnings

### **Never Mix Databases**
```yaml
WRONG:
  - Storing game state in voice_ninja (AI memory database)
  - Putting embeddings in bbworlds_nexus (game database)
  - Cross-database joins (use API calls instead)

CORRECT:
  - Each service owns exactly one database
  - Communication via APIs, not database joins
  - Clear data ownership boundaries
```

### **Backup Priority**
```yaml
Critical (Daily + Offsite):
  - voice_ninja: Irreplaceable conversation history
  - bbworlds_auth: User accounts and credentials

Important (Daily):
  - bbworlds_nexus: Game state (can be rebuilt from events)
  - bbworlds_world: Assets (stored in S3/CDN anyway)
```

---

## 📊 Current Database Status

### **✅ Working Databases**
- **voice_ninja**: Bob's memory system with EEMS (9 tables) ✅
  - `companion_memories`: Active, storing embeddings
  - `companion_relationships`: Tracking user relationships
  - Size: ~50MB (as of Aug 31, 2025)

### **✅ External Database (poqpoq.com)**
- **poqpoq_pg**: Payment Gateway with authentication
  - Handles all user login/registration
  - OAuth providers integrated
  - Payment processing ready

### **❌ Needs Creation**
- **bbworlds_nexus**: NEXUS game state (23 tables planned)
  - Schema ready in `/nexus/database/schema_v2_enhanced.sql`
  - Blocking NEXUS server startup

### **🔄 Future Databases**
- **bbworlds_world**: Asset management

---

## 🎯 Success Metrics

### **Database Separation Success**
- ✅ voice_ninja: Isolated AI memory system
- ⏳ bbworlds_nexus: Needs creation for game state
- ⏳ bbworlds_auth: Planned for unified auth
- ⏳ bbworlds_world: Planned for assets

### **Performance Targets**
- Memory queries: < 50ms (voice_ninja)
- Position updates: < 10ms (bbworlds_nexus)
- Auth checks: < 20ms (bbworlds_auth)
- Asset metadata: < 100ms (bbworlds_world)

### **Good Neighbor Success**
- ✅ Clear database boundaries defined
- ✅ No cross-database dependencies
- ✅ Each service owns one database
- ⏳ All databases documented and created

---

## 🔍 Debugging & Monitoring

### **Connection Monitoring**
```bash
# Watch active connections
watch -n 1 'sudo -u postgres psql -c "SELECT datname, usename, state, query FROM pg_stat_activity WHERE state = '"'"'active'"'"';"'

# Check for blocking queries
sudo -u postgres psql -c "SELECT pid, usename, pg_blocking_pids(pid) as blocked_by, query FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0;"
```

### **Performance Monitoring**
```bash
# Slow query log (add to postgresql.conf)
log_min_duration_statement = 100  # Log queries over 100ms

# Check table bloat
sudo -u postgres psql -d voice_ninja -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

---

## 📅 Migration Timeline

### **Phase 1: NEXUS Database** (TODAY)
- [x] Document database architecture
- [ ] Create bbworlds_nexus database
- [ ] Apply schema
- [ ] Start NEXUS server

### **Phase 2: Verify Integration** (This Week)
- [ ] Test NEXUS ↔ Cognition bridge
- [ ] Verify memory persistence
- [ ] Monitor performance

### **Phase 3: Additional Databases** (Next Sprint)
- [ ] Design auth database schema
- [ ] Create bbworlds_auth
- [ ] Migrate user accounts
- [ ] Create bbworlds_world for assets

---

**This Good Neighbor Policy ensures Voice Ninja, BBWorlds, and all related services maintain clean database separation while enabling efficient data flow through well-defined API boundaries.**

*Last Updated: August 31, 2025*  
*Status: NEXUS database pending creation*
*Next Action: Execute database creation commands*