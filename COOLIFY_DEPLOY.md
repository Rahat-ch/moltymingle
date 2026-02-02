# Coolify Auto-Deploy Setup (Preferred Method)

## Overview
GitHub Actions builds Docker image → Pushes to GHCR → Calls Coolify API → Auto-deploys

## Prerequisites
- GitHub repo with Dockerized app
- Coolify instance running
- App deployed as "Docker Image" in Coolify

## Step-by-Step Setup

### 1. GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy to Coolify

on:
  push:
    branches: [main, master]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Trigger Coolify deployment
        if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
        env:
          API_TOKEN: ${{ secrets.COOLIFY_API_TOKEN }}
          UUID: ${{ secrets.COOLIFY_RESOURCE_UUID }}
        run: |
          curl -H "Authorization: Bearer $API_TOKEN" \
            "https://YOUR-COOLIFY-DOMAIN.com/api/v1/deploy?uuid=$UUID&force=false"
```

### 2. Get Coolify API Token

1. In Coolify → **Profile** → **Keys & Tokens** → **API Tokens**
2. Click **"Create New Token"**
3. Copy the token

### 3. Get Coolify Resource UUID

1. In Coolify → **Your Resource** → **Settings** → **General**
2. Look at the resource name/URL
3. The UUID is in the format: `docker-image-UUID-HERE`
4. Copy just the UUID part (e.g., `ckg4gckoowgg00g8oo84w0o0`)

### 4. Add GitHub Secrets

Go to: `https://github.com/USER/REPO/settings/secrets/actions`

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `COOLIFY_API_TOKEN` | Your API token from Step 2 |
| `COOLIFY_RESOURCE_UUID` | Your resource UUID from Step 3 |

### 5. Update Webhook URL

In the workflow, replace:
```yaml
"https://YOUR-COOLIFY-DOMAIN.com/api/v1/deploy?uuid=$UUID&force=false"
```

With your actual Coolify domain (e.g., `coolify.rahatcodes.com`)

### 6. Persistent Storage (SQLite/Files)

If you need data to persist across deploys:

1. In Coolify → **Your Resource** → **Persistent Storage**
2. Click **"Add Volume Mount"**
3. Fill in:
   - **Name:** `app-data`
   - **Source Path:** `/data/YOUR-APP`
   - **Destination Path:** `/app/data` (or wherever your app writes)
4. Save and redeploy

### 7. Test It

Push to main:
```bash
git commit --allow-empty -m "test: trigger auto-deploy"
git push origin main
```

Check GitHub Actions: `https://github.com/USER/REPO/actions`

Look for: `HTTP/2 200` in the "Trigger Coolify deployment" step

## Troubleshooting

| Error | Fix |
|-------|-----|
| `401 Unauthenticated` | Check `COOLIFY_API_TOKEN` is correct |
| `400 You must provide uuid or tag` | Check `COOLIFY_RESOURCE_UUID` is correct (use `uuid=` not `uid=`) |
| SQLite not persisting | Add Persistent Storage volume in Coolify |
| "unable to open database file" | Run container as root (remove `USER` from Dockerfile) |

## Example Dockerfile

```dockerfile
FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create data dir (for SQLite)
RUN mkdir -p /app/data

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Run as root for volume mount permissions
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_PATH=/app/data/database.sqlite

CMD ["node", "server.js"]
```

## Summary

Every push to `main`:
1. GitHub Actions builds Docker image
2. Pushes to GitHub Container Registry
3. Calls Coolify API with Bearer token
4. Coolify pulls new image and deploys
5. Zero downtime, fully automated! 🚀
