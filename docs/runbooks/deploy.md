# Deploy Runbook

## Prerequisites

- Docker 24+
- Kubernetes 1.28+ cluster access
- `kubectl` configured
- Container registry access (GHCR)

## Quick Deploy (Development)

```bash
# Build and push images
docker compose -f apps/api/docker-compose.yml build
docker tag rootline-api ghcr.io/your-org/rootline-api:latest
docker push ghcr.io/your-org/rootline-api:latest

# Deploy to Kubernetes
kubectl apply -f k8s/
```

## Production Deploy

### 1. Build Images

```bash
# API
docker build -t ghcr.io/your-org/rootline-api:v1.2.3 -f apps/api/Dockerfile .

# Web
docker build -t ghcr.io/your-org/rootline-web:v1.2.3 -f apps/web/Dockerfile .

# Push
docker push ghcr.io/your-org/rootline-api:v1.2.3
docker push ghcr.io/your-org/rootline-web:v1.2.3
```

### 2. Update Kubernetes Manifests

```bash
# Update image tags in k8s/manifests/
sed -i 's|image: ghcr.io/your-org/rootline-api:.*|image: ghcr.io/your-org/rootline-api:v1.2.3|' k8s/manifests/api-deployment.yaml
sed -i 's|image: ghcr.io/your-org/rootline-web:.*|image: ghcr.io/your-org/rootline-web:v1.2.3|' k8s/manifests/web-deployment.yaml
```

### 3. Deploy

```bash
kubectl apply -f k8s/manifests/
```

### 4. Verify

```bash
# Check rollout
kubectl rollout status deployment/rootline-api
kubectl rollout status deployment/rootline-web

# Check health
curl https://api.yourdomain.com/api/v1/health
curl https://yourdomain.com/api/v1/health
```

## Rollback

```bash
# Quick rollback
kubectl rollout undo deployment/rootline-api
kubectl rollout undo deployment/rootline-web

# Or specific revision
kubectl rollout undo deployment/rootline-api --to-revision=3
```

## Database Migrations

Migrations run automatically on API startup via Alembic. For manual control:

```bash
# Check current revision
kubectl exec -it deployment/rootline-api -- alembic current

# Upgrade manually
kubectl exec -it deployment/rootline-api -- alembic upgrade head

# Downgrade (if needed)
kubectl exec -it deployment/rootline-api -- alembic downgrade -1
```

## Seed Data Reset (Development Only)

```bash
# Reset database and re-seed
kubectl exec -it deployment/rootline-api -- python -c "
from app.db import Base, engine
from app.seed import seed
from app.config import get_settings
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
from app.db import SessionLocal
db = SessionLocal()
seed(db)
print('Database reseeded')
"
```

## Common Operations

### Scale API

```bash
kubectl scale deployment rootline-api --replicas=5
```

### View Logs

```bash
# API logs
kubectl logs -f deployment/rootline-api -c api

# Database logs
kubectl logs -f deployment/rootline-api -c postgres
```

### Access Database

```bash
# Port forward
kubectl port-forward svc/postgres 5432:5432

# Connect
psql postgresql://rootline:rootline@localhost:5432/rootline
```

### Clear WebSocket Connections

```bash
# Restart API pods to clear WS connections
kubectl rollout restart deployment/rootline-api
```

## Environment Variables

| Variable                     | Description                  | Default                 |
| ---------------------------- | ---------------------------- | ----------------------- |
| `ROOTLINE_DATABASE_URL`      | PostgreSQL connection string | `postgresql://...`      |
| `ROOTLINE_SECRET_KEY`        | JWT signing key              | **Required**            |
| `ROOTLINE_CORS_ORIGINS`      | Allowed origins              | `http://localhost:3000` |
| `ROOTLINE_AUTO_SEED`         | Auto-seed on startup         | `true`                  |
| `ROOTLINE_ANALYSIS_DELAY_MS` | Analysis simulation delay    | `900`                   |
