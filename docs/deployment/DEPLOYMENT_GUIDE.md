# BlackBox Avatar - Production Deployment Guide

**Server:** poqpoq.com (formerly voice-ninja.com)
**IP:** 34.220.134.216
**Target Port:** 3030 (Avatar API - see port allocation below)
**Path:** `/avatar/`

---

## 🚨 CRITICAL: Read Good Neighbor Policy First!

Before deploying, read [GOOD_NEIGHBOR_POLICY_API_ARCHITECTURE_v2_2025-08-31.md](./GOOD_NEIGHBOR_POLICY_API_ARCHITECTURE_v2_2025-08-31.md)

**Key Points:**
- **Shared server** - Multiple BlackBox tools running
- **Port allocation** - Must coordinate with existing services
- **No interference** - Services must be good neighbors
- **Apache routing** - All HTTPS via reverse proxy

---

## Port Allocation (Updated for Avatar)

### Existing Services (DO NOT USE THESE PORTS)

| Service | Port | Path | Purpose |
|---------|------|------|---------|
| Voice Ninja API | 3011 | `/` | Voice synthesis |
| User Services API | 3012 | `/auth/` | Authentication & user data |
| **NEXUS Server** | 3020 | `/nexus/` | Game state & quests |
| BBWorlds Presentation | 8002 | `/world/api/` | World rendering |
| Companion WebSocket | 8002 | `/ws` | AI chat |
| Perception API | 8003 | `/api/perception/` | Spatial awareness |
| Cognition API | 8004 | `/api/cognition/` | Vision processing |
| Unified AI Streams | 8005 | `/ai-streams/` | AI services |
| Chatterbox TTS | 8080 | (internal) | Voice engine |
| Bob GPT API | 8081 | `/api/bob/` | AI companion |

### **BlackBox Avatar Assignment**

| Service | Port | Path | Purpose | Status |
|---------|------|------|---------|--------|
| **Avatar API** | **3030** | **/avatar/api/** | Character creation API | 🔄 Planned |
| **Avatar Frontend** | N/A | **/avatar/** | Web UI (static files) | 🔄 Planned |

**Why Port 3030?**
- Fits in 3000 range with other user-facing services
- Not conflicting with existing allocations
- Easy to remember (30 = "Avatar")

---

## Server Access

### SSH Access

```bash
# Primary server
ssh -i ~/.ssh/poqpoq-new.pem ubuntu@poqpoq.com

# Legacy (same server, old domain)
ssh -i ~/.ssh/voice-ninja.pem ubuntu@voice-ninja.com
```

**Note:** `poqpoq.com` and `voice-ninja.com` point to same server (34.220.134.216)

### Server Specs
- **OS:** Ubuntu 24.04 LTS
- **Python:** 3.12.3
- **Node.js:** v18.20.8
- **PostgreSQL:** 16.9
- **Apache:** 2.4.58

---

## Directory Structure (Production)

```
/var/www/avatar/                    # Web root (Apache serves from here)
├── index.html                      # Main character creator UI
├── js/                             # Frontend JavaScript
│   ├── main.js
│   ├── avatar-viewer.js
│   ├── morph-controls.js
│   └── api-client.js
├── css/                            # Stylesheets
├── assets/                         # Static assets (images, icons)
└── models/                         # Sample GLB files for testing

/home/ubuntu/avatar/                # Application root
├── backend/                        # Python API
│   ├── venv/                       # Python 3.11+ virtual environment
│   ├── api/
│   │   ├── main.py                 # FastAPI entry point
│   │   ├── routes/
│   │   ├── engine/
│   │   └── export/
│   ├── requirements.txt
│   ├── .env                        # Environment variables (NOT in git)
│   └── ecosystem.config.js         # PM2 configuration
├── assets/                         # MakeHuman assets (NOT in web root)
│   ├── base/
│   ├── targets/
│   ├── materials/
│   └── rigs/
├── logs/                           # Symlink to /var/log/avatar/
└── scripts/                        # Utility scripts

/var/log/avatar/                    # Log directory
├── avatar-api.log
├── avatar-api-error.log
└── access.log
```

---

## Database Configuration

**Database:** `bbworlds_nexus` (shared with /world)
**User:** `avatar_user` (to be created)
**Host:** localhost (PostgreSQL on same server)

### Avatar Tables

```sql
-- User-created avatars
CREATE TABLE avatars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),              -- From existing users table
    avatar_name VARCHAR(100),

    -- Morph data
    morph_data JSONB NOT NULL,                      -- Slider values for all morphs

    -- Export data
    glb_url TEXT,                                   -- S3 URL to exported GLB
    thumbnail_url TEXT,                             -- Preview image

    -- Material data
    skin_tone VARCHAR(50) DEFAULT 'medium',
    eye_color VARCHAR(50) DEFAULT 'brown',

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT false,

    -- Stats
    export_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0
);

CREATE INDEX idx_avatars_user_id ON avatars(user_id);
CREATE INDEX idx_avatars_created_at ON avatars(created_at DESC);
CREATE INDEX idx_avatars_public ON avatars(is_public) WHERE is_public = true;
```

**Integration with NEXUS:**
- Avatar GLB URLs stored in `characters.model_url`
- Avatar creator populates `characters` table when user saves
- No duplicate data - avatars table is for creation history/gallery

See [../database/database.md](../database/database.md) for full database schema.

---

## Apache Configuration

**VirtualHost Config:** `/etc/apache2/sites-available/poqpoq.com.conf`

### Add to Apache Config

```apache
# BlackBox Avatar - Frontend (static files)
Alias /avatar /var/www/avatar
<Directory /var/www/avatar>
    Options -Indexes +FollowSymLinks
    AllowOverride None
    Require all granted

    # SPA routing - serve index.html for all routes
    <IfModule mod_rewrite.c>
        RewriteEngine On
        RewriteBase /avatar/
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /avatar/index.html [L]
    </IfModule>
</Directory>

# BlackBox Avatar - API (reverse proxy to port 3030)
<Location /avatar/api>
    ProxyPass http://localhost:3030/api
    ProxyPassReverse http://localhost:3030/api

    # CORS headers for API
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</Location>

# Handle preflight OPTIONS requests
<Location /avatar/api>
    <Limit OPTIONS>
        Require all granted
    </Limit>
</Location>
```

### Enable Required Modules

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
sudo a2enmod rewrite
sudo systemctl restart apache2
```

---

## Backend Deployment

### 1. Initial Setup

```bash
# SSH to server
ssh -i ~/.ssh/poqpoq-new.pem ubuntu@poqpoq.com

# Create directories
sudo mkdir -p /var/www/avatar
sudo mkdir -p /var/log/avatar
sudo mkdir -p /home/ubuntu/avatar/{backend,assets,scripts}

# Set ownership
sudo chown -R ubuntu:www-data /var/www/avatar
sudo chown -R ubuntu:ubuntu /home/ubuntu/avatar
sudo chown -R www-data:www-data /var/log/avatar
```

### 2. Deploy Backend Code

```bash
# From local machine - deploy backend
cd ~/blackbox/BlackBoxAvatar
rsync -avz --exclude 'venv' --exclude '.env' --exclude '__pycache__' \
  -e "ssh -i ~/.ssh/poqpoq-new.pem" \
  ./backend/ ubuntu@poqpoq.com:/home/ubuntu/avatar/backend/

# SSH to server
ssh -i ~/.ssh/poqpoq-new.pem ubuntu@poqpoq.com

# Set up Python environment
cd /home/ubuntu/avatar/backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
nano .env  # Edit with production values
```

### 3. Environment Variables (.env)

```bash
# /home/ubuntu/avatar/backend/.env

# Server
NODE_ENV=production
API_PORT=3030
API_HOST=0.0.0.0

# Database (using existing bbworlds_nexus)
DATABASE_URL=postgresql://avatar_user:SECURE_PASSWORD@localhost:5432/bbworlds_nexus

# AWS S3 (for GLB exports)
AWS_ACCESS_KEY_ID=YOUR_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET
AWS_REGION=us-west-2
S3_BUCKET_NAME=poqpoq-avatars

# Paths
ASSETS_PATH=/home/ubuntu/avatar/assets
TEMP_PATH=/home/ubuntu/avatar/tmp

# Security
JWT_SECRET=Avatar_RANDOM_64_CHAR_STRING
ALLOWED_ORIGINS=https://poqpoq.com,https://voice-ninja.com

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/avatar/avatar-api.log
```

### 4. PM2 Process Management

```bash
# Install PM2 globally (if not already installed)
sudo npm install -g pm2

# Create PM2 ecosystem file
nano /home/ubuntu/avatar/backend/ecosystem.config.js
```

**ecosystem.config.js:**

```javascript
module.exports = {
  apps: [{
    name: 'avatar-api',
    script: 'venv/bin/uvicorn',
    args: 'api.main:app --host 0.0.0.0 --port 3030 --workers 4',
    cwd: '/home/ubuntu/avatar/backend',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/avatar/avatar-api-error.log',
    out_file: '/var/log/avatar/avatar-api.log',
    merge_logs: true,
    time: true
  }]
};
```

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Set up PM2 to start on boot
pm2 startup
# (Follow the command it outputs)

# Check status
pm2 status
pm2 logs avatar-api --lines 50
```

---

## Frontend Deployment

### Deploy Static Files

```bash
# From local machine
cd ~/blackbox/BlackBoxAvatar
rsync -avz --delete \
  -e "ssh -i ~/.ssh/poqpoq-new.pem" \
  ./frontend/dist/ ubuntu@poqpoq.com:/var/www/avatar/

# Or if using dev files directly (no build step yet)
rsync -avz --delete \
  -e "ssh -i ~/.ssh/poqpoq-new.pem" \
  ./frontend/ ubuntu@poqpoq.com:/var/www/avatar/
```

### Verify Permissions

```bash
ssh -i ~/.ssh/poqpoq-new.pem ubuntu@poqpoq.com
sudo chown -R ubuntu:www-data /var/www/avatar
sudo chmod -R 755 /var/www/avatar
```

---

## Asset Deployment

```bash
# Assets are LARGE - download directly on server
ssh -i ~/.ssh/poqpoq-new.pem ubuntu@poqpoq.com

cd /home/ubuntu/avatar
git clone https://github.com/makehumancommunity/makehuman-assets.git assets/makehuman-assets

# Extract needed assets
cd /home/ubuntu/avatar/backend
source venv/bin/activate
python scripts/extract_assets.py

# This creates:
# /home/ubuntu/avatar/assets/base/base_mesh.json
# /home/ubuntu/avatar/assets/targets/macros/*.json
# /home/ubuntu/avatar/assets/materials/skins/*.png

# Clean up large reference clone
rm -rf /home/ubuntu/avatar/assets/makehuman-assets
```

---

## Health Checks & Monitoring

### Test API Endpoint

```bash
# Health check
curl http://localhost:3030/health
# Expected: {"status":"healthy","service":"avatar-api","version":"0.1.0"}

# Public URL
curl https://poqpoq.com/avatar/api/health

# Test morph endpoint
curl -X POST https://poqpoq.com/avatar/api/morph/apply \
  -H "Content-Type: application/json" \
  -d '{
    "targets": [
      {"name": "macros/universal-age", "weight": 0.5}
    ]
  }'
```

### Check Logs

```bash
# PM2 logs
pm2 logs avatar-api --lines 100

# Direct log files
tail -f /var/log/avatar/avatar-api.log
tail -f /var/log/avatar/avatar-api-error.log

# Apache logs
sudo tail -f /var/log/apache2/access.log | grep avatar
sudo tail -f /var/log/apache2/error.log | grep avatar
```

### Monitor Process

```bash
# PM2 monitoring
pm2 monit

# Process status
ps aux | grep uvicorn
sudo netstat -tlnp | grep 3030

# Resource usage
htop  # (filter for 'uvicorn')
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Port 3030 verified available (`sudo netstat -tlnp | grep 3030`)
- [ ] Database user `avatar_user` created
- [ ] S3 bucket `poqpoq-avatars` created with CORS
- [ ] Apache config updated and tested
- [ ] .env file created with production secrets
- [ ] Assets extracted and available

### Deployment Steps
- [ ] Backend code deployed to `/home/ubuntu/avatar/backend/`
- [ ] Python venv created and dependencies installed
- [ ] PM2 ecosystem config created
- [ ] Avatar API started with PM2
- [ ] Frontend files deployed to `/var/www/avatar/`
- [ ] Apache reloaded (`sudo systemctl reload apache2`)

### Post-Deployment
- [ ] Health endpoint returns 200 OK
- [ ] Frontend loads at https://poqpoq.com/avatar/
- [ ] Morph API endpoint tested
- [ ] GLB export tested
- [ ] Logs are writing correctly
- [ ] PM2 startup configured
- [ ] Monitoring dashboard updated

---

## Rollback Procedure

If deployment fails:

```bash
# Stop new service
pm2 stop avatar-api

# Remove from PM2
pm2 delete avatar-api

# Revert Apache config
sudo nano /etc/apache2/sites-available/poqpoq.com.conf
# (Comment out Avatar sections)
sudo systemctl reload apache2

# Clean up
sudo rm -rf /var/www/avatar
rm -rf /home/ubuntu/avatar/backend
```

---

## Scaling Considerations

### When to Scale

- **CPU > 70%** for sustained periods
- **Memory > 80%** of allocated
- **Response times > 1 second** consistently
- **Queue depth > 10** requests

### Horizontal Scaling

```javascript
// Update ecosystem.config.js for multiple workers
{
  instances: 4,  // Use 4 CPU cores
  exec_mode: 'cluster'
}
```

### Vertical Scaling

- Increase PM2 `max_memory_restart`
- Add more CPUs to server
- Increase PostgreSQL connection pool

---

## Security Checklist

- [ ] `.env` file has 600 permissions
- [ ] Database credentials not in git
- [ ] S3 bucket has proper CORS/ACL
- [ ] API rate limiting configured
- [ ] Input validation on all endpoints
- [ ] GLB export file size limits
- [ ] User upload sanitization
- [ ] Apache logs are rotating

---

## Integration with Other Services

### With /world (NEXUS)
- Avatar GLB URLs stored in `characters.model_url`
- NEXUS reads from same database
- No API calls needed - direct DB access

### With User Services (Port 3012)
- Authentication via User Services API
- JWT tokens validated
- User IDs from existing `users` table

### With Voice Ninja (Port 3011)
- Optional: Voice synthesis for avatar preview
- Not required for MVP

---

## Troubleshooting

### API Not Responding

```bash
# Check if process is running
pm2 status avatar-api

# Check port binding
sudo netstat -tlnp | grep 3030

# Check logs for errors
pm2 logs avatar-api --err --lines 50

# Restart if needed
pm2 restart avatar-api
```

### Apache 404 Errors

```bash
# Verify alias exists
sudo apache2ctl -S | grep avatar

# Check directory permissions
ls -la /var/www/avatar

# Test Apache config
sudo apache2ctl configtest

# Check Apache error log
sudo tail -f /var/log/apache2/error.log
```

### Database Connection Errors

```bash
# Test PostgreSQL connection
psql -U avatar_user -d bbworlds_nexus -h localhost

# Check if user exists
sudo -u postgres psql -c "\du avatar_user"

# Verify connection string in .env
cat /home/ubuntu/avatar/backend/.env | grep DATABASE_URL
```

---

## Deployment Automation (Future)

**TODO:** Create GitHub Actions workflow for automated deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy Backend
        run: |
          rsync -avz backend/ ${{ secrets.DEPLOY_USER }}@poqpoq.com:/home/ubuntu/avatar/backend/

      - name: Restart PM2
        run: |
          ssh ${{ secrets.DEPLOY_USER }}@poqpoq.com "pm2 restart avatar-api"
```

---

**Last Updated:** October 13, 2025
**Next Review:** After first production deployment
