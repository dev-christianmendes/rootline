# Architecture Documentation

This directory contains architecture diagrams and documentation for Rootline.

## C4 Model Diagrams

### System Context (Level 1)

```mermaid
C4Context
title System Context Diagram for Rootline

Person(user, "Engineer", "On-call engineer investigating incidents")
System(rootline, "Rootline", "Incident investigation & correlation platform")

System_Ext(observability, "Observability Stack", "Prometheus, Grafana, Loki, Tempo")
System_Ext(git, "Git Repository", "Source code & deployment manifests")
System_Ext(ci, "CI/CD", "GitHub Actions")

Rel(user, rootline, "Investigates incidents via web UI", "HTTPS")
Rel(rootline, observability, "Queries metrics/logs/traces", "PromQL, LogQL, TraceQL")
Rel(rootline, git, "Reads deployment metadata", "Git API")
Rel(ci, rootline, "Deploys new versions", "Container registry")
```

### Container Diagram (Level 2)

```mermaid
C4Container
title Container Diagram for Rootline

Person(user, "Engineer")

Container_Boundary(rootline, "Rootline") {
    Container(web, "Web App", "Next.js 15, React 19", "Serves SPA, proxies API calls")
    Container(api, "API", "FastAPI, Python 3.12", "REST API, WebSocket, business logic")
    ContainerDb(db, "Database", "PostgreSQL 16", "Services, incidents, metrics, logs, traces")
    Container(ws, "WebSocket", "FastAPI + websockets", "Real-time updates")
}

Container_Ext(prom, "Prometheus", "Metrics collection")
Container_Ext(grafana, "Grafana", "Dashboards")
Container_Ext(loki, "Loki", "Log aggregation")
Container_Ext(tempo, "Tempo", "Trace storage")

Rel(user, web, "HTTPS", "Browser")
Rel(web, api, "Proxies /api/v1/*", "HTTP")
Rel(web, ws, "WebSocket", "WS")
Rel(api, db, "SQL", "PostgreSQL")
Rel(ws, db, "SQL", "PostgreSQL")
Rel(api, prom, "Metrics endpoint", "HTTP")
Rel(api, tempo, "Push traces", "gRPC/HTTP")
```

### Component Diagram - API (Level 3)

```mermaid
C4Component
title Component Diagram - Rootline API

Container_Boundary(api, "API") {
    Component(routers, "Routers", "FastAPI", "HTTP routing, validation")
    Component(auth, "Auth", "JWT + bcrypt", "Authentication/authorization")
    Component(services, "Services", "Business logic", "Incidents, services, deployments")
    Component(analysis, "Analysis", "Correlation engine", "Incident investigation")
    Component(seed, "Seed", "Data generator", "Deterministic mock data")
    Component(ws_mgr, "WS Manager", "WebSocket manager", "Real-time connections")
}

ComponentDb(db, "PostgreSQL", "SQLAlchemy ORM")

Rel(routers, auth, "Validates JWT")
Rel(routers, services, "Delegates business logic")
Rel(services, db, "SQLAlchemy")
Rel(analysis, services, "Queries data")
Rel(ws_mgr, services, "Broadcasts updates")
```

## Deployment Architecture

```mermaid
C4Deployment
title Deployment Diagram

Deployment_Node(k8s, "Kubernetes Cluster") {
    Deployment(web, "web", "Next.js", "3 replicas")
    Deployment(api, "api", "FastAPI", "3 replicas")
    Deployment(db, "postgres", "PostgreSQL", "1 primary + 1 replica")
    Deployment(prom, "prometheus", "Prometheus", "1 replica")
    Deployment(grafana, "grafana", "Grafana", "1 replica")
}

Rel(web, api, "Internal service", "HTTP")
Rel(api, db, "Internal service", "PostgreSQL")
```

## Technology Stack

| Layer    | Technology           | Version           |
| -------- | -------------------- | ----------------- |
| Frontend | Next.js (App Router) | 15.x              |
| Frontend | React                | 19.x              |
| Frontend | TypeScript           | 5.x               |
| Frontend | TanStack Query       | 5.x               |
| Frontend | Tailwind CSS         | 4.x               |
| Backend  | FastAPI              | 0.115+            |
| Backend  | Python               | 3.12              |
| Backend  | SQLAlchemy           | 2.0               |
| Backend  | PostgreSQL           | 16                |
| Backend  | Alembic              | 1.13              |
| Backend  | WebSockets           | websockets 13     |
| Backend  | Prometheus           | prometheus-client |
| Backend  | Logging              | structlog         |
| Infra    | Docker               | 24+               |
| Infra    | Kubernetes           | 1.28+             |
| CI/CD    | GitHub Actions       | -                 |

## Data Flow

### Incident Creation

1. Engineer creates incident via Web UI
2. Web → API `POST /incidents` (JWT auth)
3. API validates, creates incident in PostgreSQL
4. API broadcasts via WebSocket to connected clients
5. WebSocket clients receive real-time update

### Real-time Metrics

1. Frontend connects to `/ws/services/{id}/metrics`
2. API streams metric updates via WebSocket
3. Frontend updates charts in real-time

### Incident Analysis

1. Engineer clicks "Analyze" on incident
2. API `POST /incidents/{id}/analyze`
3. Analysis service correlates:
   - Recent deployments to affected services
   - Metric anomalies (error rate, latency spikes)
   - Error logs and traces
   - Dependency health
4. Returns hypotheses with evidence/counter-evidence
