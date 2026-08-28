# Deployment Guide

This guide covers deploying Fatigue in production using Docker.

---

## Quick Start

**Step 1 — Clone and configure**

```bash
git clone https://github.com/Chefodelocho/fatigue.git
cd fatigue

# Generate a strong session secret
echo "SESSION_COOKIE_SECRET=$(openssl rand -hex 32)" > .env
```

**Step 2 — Start**

```bash
docker compose up -d
```

The app is available at [http://localhost:3000](http://localhost:3000).

---

## Using the Pre-built Image

Docker images are published automatically to GitHub Container Registry on every push to `main`:

```
ghcr.io/Chefodelocho/fatigue:latest
```

To use the published image instead of building locally, replace the `build:` block in `docker-compose.yml`:

```yaml
services:
  fatigue-web:
    image: ghcr.io/Chefodelocho/fatigue:latest
    # remove the build: section
```

Then pull and run:

```bash
docker compose pull
docker compose up -d
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SESSION_COOKIE_SECRET` | **Yes** | `change-me-in-production` | Signs session cookies. Generate with `openssl rand -hex 32`. |
| `PORT` | No | `3000` | Port the server listens on. |
| `NODE_ENV` | No | `production` | Runtime environment. |
| `NEXT_TELEMETRY_DISABLED` | No | `1` | Disables Next.js telemetry. |
| `MAX_SCATTER_POINTS` | No | `10000` | Max points rendered in Haigh diagram scatter. |
| `MAX_3D_POINTS` | No | `10000` | Max points rendered in the 3D safety factor plot. |

Copy `.env.example` to `.env` as a starting point:

```bash
cp .env.example .env
# Edit SESSION_COOKIE_SECRET at minimum
```

---

## Volumes

| Container path | Purpose | Recommended mount |
|---|---|---|
| `/app/data/reference` | Built-in FEM reference dataset | `./data/reference:ro` (read-only) |
| `/app/data/analyses` | Saved analysis results | Named Docker volume for persistence |

The reference dataset ships with the repository (`data/reference/`). Mount it read-only so the container cannot modify it. Analysis results are written to `/app/data/analyses` — use a named volume to persist them across container restarts.

---

## Production Checklist

- [ ] Set `SESSION_COOKIE_SECRET` to a random value (≥ 32 bytes)
- [ ] Put the app behind a TLS-terminating reverse proxy
- [ ] Use a named Docker volume for `/app/data/analyses`
- [ ] Verify the health check passes: `curl http://localhost:3000/api/health`
- [ ] The container runs as a non-root user (`fatigue`, UID 1001) — no extra hardening needed

---

## Reverse Proxy

**Caddy** (automatic HTTPS):

```Caddyfile
fatigue.example.com {
    reverse_proxy localhost:3000
}
```

**nginx**:

```nginx
server {
    listen 443 ssl;
    server_name fatigue.example.com;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Health Check

`GET /api/health` returns HTTP 200 when the app is ready. Docker polls this every 30 seconds (5 s timeout, 3 retries, 30 s start period). Use the same endpoint with load balancers or Kubernetes liveness/readiness probes.

---

## Updating

```bash
# Pull the latest image (if using GHCR)
docker compose pull

# Restart with zero-downtime replacement
docker compose up -d
```

Saved analyses in the named volume (`fatigue-analyses`) survive updates.

---

## Development Mode (hot-reloading)

For local development with live source code reloading:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Changes to `apps/web/src/` are reflected immediately. Changes to shared packages (`packages/`) require a rebuild:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml build
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```
