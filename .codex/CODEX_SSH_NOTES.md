# BlackBox Avatar - SSH & Production Access

## Production Servers
- `poqpoq.com` and `voice-ninja.com` point to the same host
- Primary user: `ubuntu`
- All runtime APIs (Avatar, NEXUS, Worlds, etc.) run here in production

## SSH Access
```bash
ssh -i ~/.ssh/poqpoq-new.pem ubuntu@poqpoq.com
# Alternate:
ssh -i ~/.ssh/poqpoq-new.pem ubuntu@voice-ninja.com
```

### Notes
- PEM key `poqpoq-new.pem` lives in the repo root `~/.ssh/`
- Ensure file permissions are `chmod 600 ~/.ssh/poqpoq-new.pem`
- For DB access from local development, create a tunnel:
  ```bash
  ssh -i ~/.ssh/poqpoq-new.pem -L 5432:localhost:5432 ubuntu@poqpoq.com
  ```
- NEXUS service runs under `systemd` (not PM2). Service name: `nexus.service`
  ```bash
  sudo systemctl status nexus
  sudo journalctl -u nexus -f
  ```
- NEXUS source lives in sister repo `/home/ubuntu/world/`
- Babylon.js + security constraints prevent running NEXUS under PM2

## API Deployment Reminders
- Avatar backend will also run on this server (port 3030)
- Coordinate with existing systemd services before adding new ones
- Keep `/etc/apache2/sites-available/` in sync with new reverse proxy routes

