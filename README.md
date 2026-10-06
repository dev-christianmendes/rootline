# ROOTLINE

<div align="center">

![Rootline Logo](docs/assets/logo.svg)

**From incident to root cause.**

_Intelligent incident investigation & operations platform. Rootline correlaciona métricas, logs, traces, deployments, serviços e dependências para ajudar engenheiros a investigar incidentes e identificar possíveis causas-raiz._

> **AI doesn't guess. It investigates.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![Python Version](https://img.shields.io/badge/python-%3E%3D3.12-blue.svg)](https://python.org/)
[![Build Status](https://img.shields.io/github/actions/workflow/status/dev-christianmendes/rootline/ci.yml?branch=main)](https://github.com/dev-christianmendes/rootline/actions)
[![Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen.svg)](https://github.com/dev-christianmendes/rootline)

</div>

---

## 📸 Screenshots

### Dashboard Overview

> Visão geral do estado dos sistemas com métricas de saúde, incidentes ativos e deployments recentes.

![Dashboard Overview](docs/assets/screenshots/dashboard-overview.svg)

### Incident Center

> Lista de incidentes com filtros por severidade, status e busca textual.

![Incident Center](docs/assets/screenshots/incident-center.svg)

### Incident Detail & Analysis

> Detalhes do incidente com timeline, evidências, hipóteses e grafo de evidências.

![Incident Detail](docs/assets/screenshots/incident-detail.svg)

### Service Map & Dependencies

> Visualização da topologia de serviços e dependências com saúde em tempo real.

![Service Map](docs/assets/screenshots/service-map.svg)

### Real-time Metrics & WebSocket

> Métricas em tempo real via WebSocket com gráficos interativos.

![Real-time Metrics](docs/assets/screenshots/realtime-metrics.svg)

---

## 🎯 Visão Geral

O **Rootline** é uma plataforma de investigação de incidentes e operações que atua como uma **camada de correlação inteligente** sobre suas ferramentas de observabilidade existentes (Prometheus, Grafana, Loki, Tempo, Jaeger, etc.). Ele não substitui essas ferramentas — ele as conecta e automatiza a análise.

### Problema que Resolve

| Problema Tradicional                                       | Solução Rootline                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| Engenheiros perdem tempo correlacionando dados manualmente | Correlação automática: deployments → métricas → logs → traces |
| Hipóteses baseadas em intuição                             | Hipóteses baseadas em evidências com confidence scoring       |
| Contexto fragmentado entre ferramentas                     | Visão unificada: métricas + logs + traces + deployments       |
| Onboarding lento para novos engenheiros                    | Grafo de evidências visual + timeline automática              |

### Principais Capacidades

- 🔍 **Investigação Assistida por IA** — Gera hipóteses ranqueadas por confidence com evidências de suporte e contra-evidências
- 📊 **Correlação Multi-dimensional** — Deployments ↔ Métricas ↔ Logs ↔ Traces ↔ Dependências
- ⚡ **Tempo Real via WebSocket** — Updates instantâneos de incidentes, métricas e logs
- 🗺️ **Mapa de Serviços Interativo** — Topologia visual com saúde, latência, error rate e dependências
- 📈 **Métricas Históricas** — Séries temporais com filtros de tempo, agregações e drill-down
- 🔄 **Timeline Unificada** — Deployments, incidentes, investigações e ações em uma timeline única

---

## 🏗️ Arquitetura

### Visão Geral (C4 Context)

```mermaid
C4Context
title System Context Diagram for Rootline

Person(engineer, "Engineer", "On-call engineer investigating incidents")
System(rootline, "Rootline", "Incident investigation & correlation platform")

System_Ext(observability, "Observability Stack", "Prometheus, Grafana, Loki, Tempo")
System_Ext(git, "Git Repository", "Source code & deployment manifests")
System_Ext(ci, "CI/CD", "GitHub Actions")

Rel(engineer, rootline, "Investigates incidents via web UI", "HTTPS")
Rel(rootline, observability, "Queries metrics/logs/traces", "PromQL, LogQL, TraceQL")
Rel(rootline, git, "Reads deployment metadata", "Git API")
Rel(ci, rootline, "Deploys new versions", "Container registry")
```

### Container Diagram

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

### Stack Tecnológico

| Camada       | Tecnologia           | Versão            |
| ------------ | -------------------- | ----------------- |
| **Frontend** | Next.js (App Router) | 15.x              |
|              | React                | 19.x              |
|              | TypeScript           | 5.x               |
|              | TanStack Query       | 5.x               |
|              | Tailwind CSS         | 4.x               |
|              | Zustand              | 5.x               |
| **Backend**  | FastAPI              | 0.115+            |
|              | Python               | 3.12              |
|              | SQLAlchemy           | 2.0               |
|              | PostgreSQL           | 16                |
|              | Alembic              | 1.13              |
|              | WebSockets           | websockets 13     |
|              | Prometheus           | prometheus-client |
|              | Logging              | structlog         |
| **Infra**    | Docker               | 24+               |
|              | Kubernetes           | 1.28+             |
| **CI/CD**    | GitHub Actions       | -                 |

---

## 🚀 Quick Start

### Pré-requisitos

- **Node.js** ≥ 20
- **Python** ≥ 3.12
- **Docker** 24+ (para PostgreSQL + API)
- **npm** ≥ 10

### Instalação Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/dev-christianmendes/rootline.git
cd rootline

# 2. Instale dependências (frontend + packages)
npm install

# 3. Suba a infraestrutura (PostgreSQL + API via Docker)
npm run infra:up

# 4. Inicie o frontend (em outro terminal)
npm run dev
```

> **Acesse:** http://localhost:3000 (frontend) | http://localhost:8000/docs (API docs)

### Estrutura de Comandos

```bash
# Infraestrutura
npm run infra:up       # Sobe PostgreSQL + API (Docker Compose)
npm run infra:down     # Para containers (preserva volume)
npm run infra:reset    # Recria volume + reseed do banco
npm run infra:logs     # Logs da API em tempo real

# Desenvolvimento
npm run dev            # Next.js dev server (localhost:3000)
npm run build          # Build de produção Next.js
npm run lint           # ESLint
npm run typecheck      # TypeScript (web + packages)

# Mock Data
npm run generate:mock  # Regenera mock data determinístico
npm run test:mock      # Valida se mock data = gerador

# API (Backend)
npm run api:install    # Cria venv + instala deps Python
npm run api:dev        # Uvicorn local (localhost:8000)
npm run api:test       # Testes API (SQLite + PostgreSQL)

# Testes Completos
npm test               # typecheck + lint + test:mock + api:test

# E2E Tests (Playwright)
npm run test:e2e       # Executa testes E2E
npm run test:e2e:ui    # Playwright UI mode
```

### Configuração de Ambiente

Copie `.env.example` para `.env` e ajuste:

```bash
cp .env.example .env
```

```env
# API (FastAPI) - Prefixo: ROOTLINE_
ROOTLINE_DATABASE_URL=postgresql+psycopg://rootline:rootline@localhost:5432/rootline
ROOTLINE_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
ROOTLINE_SECRET_KEY=your-super-secret-key-change-in-production
ROOTLINE_AUTO_SEED=true
ROOTLINE_ANALYSIS_DELAY_MS=900

# Frontend (Next.js)
ROOTLINE_API_URL=http://localhost:8000
NEXT_PUBLIC_SENTRY_DSN=

# Mock Data
MOCK_BASE_DATE=2026-09-24

# Docker/Infra
POSTGRES_USER=rootline
POSTGRES_PASSWORD=rootline
POSTGRES_DB=rootline
```

---

## 🎨 Funcionalidades Detalhadas

### 1. Dashboard Executivo

![Dashboard](docs/assets/screenshots/dashboard-overview.svg)

- **Health Overview**: Availability, Latência média, Error Rate, Contagem de serviços, Incidentes ativos
- **Painel de Incidentes Ativos**: Lista com severidade (P1-P4), status, serviço afetado, duração
- **Tabela de Saúde dos Serviços**: Ordenada por criticidade (critical → degraded → healthy)
- **Deployments Recentes**: Versão, autor, timestamp, status

### 2. Incident Center

![Incident Center](docs/assets/screenshots/incident-center.svg)

- **Lista paginada** com paginação server-side (50 itens/página)
- **Filtros avançados**: Severidade (P1-P4), Status (DETECTED→RESOLVED), Busca textual (ID, título, serviço, assignee)
- **Filtros persistidos** na URL (compartilháveis)
- **WebSocket real-time**: Novos incidentes aparecem instantaneamente
- **Criação de incidentes**: Modal com validação (title obrigatório, severity, service, assignee, impact)

### 3. Incident Detail & AI Analysis

![Incident Analysis](docs/assets/screenshots/incident-detail.svg)

#### Header do Incidente

- ID, Severidade (badge colorido), Status (badge + progress flow), Serviço, Assignee
- Timestamps: Started, Detected, Resolved
- Duração automática calculada

#### Análise IA (Botão "Analyze")

Gera investigação on-demand correlacionando:

| Fonte de Evidência | O que Analisa                                                     |
| ------------------ | ----------------------------------------------------------------- |
| **Deployments**    | Deployments recentes no serviço afetado (±30min)                  |
| **Métricas**       | Picos de error_rate, latency, CPU, memory no momento do incidente |
| **Logs**           | Picos de ERROR/WARN, padrões de mensagem, trace IDs               |
| **Traces**         | Spans com erro, latência anômala, downstream failures             |
| **Dependências**   | Saúde de upstreams/downstreams, circuit breakers                  |

#### Output: Hipóteses Ranqueadas

Cada hipótese contém:

- **Confidence Score** (0-100%)
- **Summary** explicativo
- **Evidências de Suporte** (fatos que corroboram)
- **Contra-evidências** (fatos que contradizem)
- **Status**: candidate | accepted | dismissed

### 4. Evidence Graph Visual

![Evidence Graph](docs/assets/screenshots/evidence-graph.svg)

- Grafo interativo (React Flow / XYFlow)
- Nós: Hipótese central + Evidências (verdes) + Contra-evidências (vermelhas)
- Edges: Correlação temporal, causalidade, dependência
- Zoom, pan, click para detalhes

### 5. Service Map & Dependencies

![Service Map](docs/assets/screenshots/service-map.svg)

- **Topologia visual** (DAG) com Cytoscape/XYFlow
- **Nós**: Serviços com health badge (🟢🟡🔴⚪)
- **Edges**: Dependências direcionadas (A → B = A depende de B)
- **Health indicators**: Latency, Error Rate, Availability badges
- **Click-through**: Clique no nó → Service Detail

### 6. Real-time Metrics & WebSocket

![Real-time Metrics](docs/assets/screenshots/realtime-metrics.svg)

- **WebSocket connections**: `/ws/services/{id}/metrics`, `/ws/incidents/{id}`, `/ws/logs`
- **Charts em tempo real**: Recharts com streaming de dados
- **Filtros**: Métrica (latency_ms, error_rate, cpu, memory, request_rate), Time range
- **Auto-reconnect** com exponential backoff

### 7. Incident Timeline & Resolution

- **Timeline unificada**: Deployments, Metric Spikes, Logs, Traces, Incident Events, Investigation Events, Resolution
- **Filtros**: Por tipo, nível, busca textual
- **Resolution Dialog**: Root cause, Summary, Mitigation, Resolved By, Resolved At

### 8. Deployments & Change Correlation

- Lista paginada de deployments (ordem cronológica)
- Filtro por serviço
- Correlação automática com incidentes (±30min window)
- Metadata: version, author, commit, description, status

---

## 🔧 Desenvolvimento

### Estrutura do Monorepo

```
rootline/
├── apps/
│   ├── api/                 # FastAPI Backend
│   │   ├── app/
│   │   │   ├── auth/        # JWT Auth (login, register, me)
│   │   │   ├── health_checks/  # /health/ready, /health/live
│   │   │   ├── observability/  # Prometheus, structlog, request ID
│   │   │   ├── routers/       # REST endpoints
│   │   │   ├── services/      # Business logic
│   │   │   ├── websockets/    # WebSocket manager
│   │   │   ├── models/        # SQLAlchemy models
│   │   │   ├── schemas/       # Pydantic schemas
│   │   │   ├── db.py          # Engine + Session
│   │   │   ├── config.py      # Pydantic Settings
│   │   │   └── main.py        # FastAPI app factory
│   │   ├── alembic/         # Migrations
│   │   ├── tests/           # Pytest suite
│   │   └── requirements.txt
│   └── web/                  # Next.js Frontend
│       ├── app/              # App Router pages
│       ├── components/       # React components
│       ├── features/         # Feature modules (hooks, queries)
│       ├── hooks/            # Custom hooks (WebSocket, etc)
│       ├── lib/              # Utils (api, format, pagination)
│       ├── context/          # React Context (WebSocket, Locale)
│       └── e2e/              # Playwright tests
├── packages/
│   ├── config/               # tsconfig, eslint configs
│   ├── types/                # Shared TypeScript types
│   └── ui/                   # Design System (@rootline/ui)
├── data/
│   ├── mock/                 # JSON datasets (git-tracked)
│   └── scripts/              # generate-mock.mjs (deterministic)
└── docs/
    ├── adr/                  # Architecture Decision Records
    ├── architecture/         # C4 diagrams (Mermaid)
    ├── runbooks/             # Deploy, Incident Response
    └── CONTRIBUTING.md
```

### Packages Compartilhados

| Package            | Descrição                                                        | Publicado   |
| ------------------ | ---------------------------------------------------------------- | ----------- |
| `@rootline/types`  | Tipos TypeScript compartilhados (Incident, Service, Metric, etc) | ✅ npm      |
| `@rootline/ui`     | Design System (Button, Card, Table, Dialog, etc)                 | ✅ npm      |
| `@rootline/config` | tsconfig, eslint configs compartilhados                          | 🔒 Internal |

---

## 🔐 Autenticação & Autorização

### JWT Stateless Auth

```
POST   /api/v1/auth/login     # username + password → access_token (Bearer)
GET    /api/v1/auth/me        # Current user info
POST   /api/v1/auth/register  # Cria novo usuário (admin only)
```

- **Algorithm**: HS256
- **Expiração**: 7 dias (configurável via `ROOTLINE_ACCESS_TOKEN_EXPIRE_MINUTES`)
- **Password Hash**: bcrypt (cost=12)
- **Proteção**: Todos endpoints mutantes (`POST`, `PATCH`, `DELETE`) requerem `Authorization: Bearer <token>`

### Rate Limiting

| Endpoint                  | Limite      |
| ------------------------- | ----------- |
| Global                    | 100 req/min |
| `/auth/login`             | 5 req/min   |
| `/auth/register`          | 5 req/min   |
| `POST /incidents`         | 30 req/min  |
| `PATCH /incidents/{id}`   | 60 req/min  |
| `/incidents/{id}/analyze` | 10 req/min  |

---

## 📊 Observabilidade

### Métricas Prometheus (`/metrics`)

| Métrica                         | Tipo      | Labels                   | Descrição                    |
| ------------------------------- | --------- | ------------------------ | ---------------------------- |
| `http_requests_total`           | Counter   | method, endpoint, status | Total requests               |
| `http_request_duration_seconds` | Histogram | method, endpoint         | Latência (buckets: 10ms-10s) |
| `db_queries_total`              | Counter   | operation, table         | Queries DB                   |
| `db_query_duration_seconds`     | Histogram | operation, table         | Latência DB                  |
| `active_connections`            | Gauge     | -                        | WebSocket ativas             |

### Logging Estruturado (structlog)

```json
{
  "timestamp": "2026-01-15T14:30:45.123Z",
  "level": "info",
  "logger": "rootline.api",
  "request_id": "abc123",
  "method": "POST",
  "path": "/api/v1/incidents",
  "status_code": 201,
  "duration_ms": 45.2,
  "user_id": "usr-123"
}
```

### Health Checks

| Endpoint            | Tipo      | Verificações                            |
| ------------------- | --------- | --------------------------------------- |
| `GET /health`       | Liveness  | Process alive                           |
| `GET /health/ready` | Readiness | DB connectivity, migrations, disk space |

---

## 🧪 Testes

### Backend (Pytest)

```bash
# Todos os testes (SQLite + PostgreSQL)
npm run api:test

# Apenas SQLite (rápido, sem Docker)
cd apps/api && .venv/bin/python -m pytest -q

# Com coverage
cd apps/api && .venv/bin/pytest --cov=app --cov-fail-under=80
```

**Cobertura Atual**: 26 testes cobrindo:

- Incident CRUD + pagination + filters
- Investigation generation + analysis
- Service metrics + pagination + filters
- Deployments listing
- System health aggregation
- WebSocket connections

### Frontend

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# E2E Tests (Playwright)
npm run test:e2e          # Headless
npm run test:e2e:ui       # UI mode

# Testes cobertos:
# - Dashboard: overview, health cards, active incidents, service table, deployments
# - Incident Center: list, filters, search, WS connection, new incident dialog
# - Incident Detail: header, summary, status flow, timeline, affected services
```

### Mock Data Determinismo

```bash
# Regenera mock data (deterministic seed = 20260924)
npm run generate:mock

# Valida se mock data == gerador (CI gate)
npm run test:mock
```

---

## 🐳 Deploy

### Desenvolvimento (Docker Compose)

```bash
# Sobe PostgreSQL + API
npm run infra:up

# Para desenvolvimento frontend apenas
npm run dev
```

### Produção (Kubernetes)

```bash
# Build images
docker build -t ghcr.io/your-org/rootline-api:v1.2.3 -f apps/api/Dockerfile .
docker build -t ghcr.io/your-org/rootline-web:v1.2.3 -f apps/web/Dockerfile .

# Push
docker push ghcr.io/your-org/rootline-api:v1.2.3
docker push ghcr.io/your-org/rootline-web:v1.2.3

# Deploy Kubernetes
kubectl apply -f k8s/manifests/

# Verificar rollout
kubectl rollout status deployment/rootline-api
kubectl rollout status deployment/rootline-web
```

### Health Checks Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health
    port: 8000
  initialDelaySeconds: 15
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/v1/health/ready
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Rollback

```bash
# Rollback rápido
kubectl rollout undo deployment/rootline-api
kubectl rollout undo deployment/rootline-web

# Rollback para revisão específica
kubectl rollout undo deployment/rootline-api --to-revision=3
```

### Database Migrations

```bash
# Verificar revisão atual
kubectl exec -it deployment/rootline-api -- alembic current

# Upgrade manual
kubectl exec -it deployment/rootline-api -- alembic upgrade head

# Downgrade (cuidado!)
kubectl exec -it deployment/rootline-api -- alembic downgrade -1
```

---

## 🔄 CI/CD Pipeline

```mermaid
graph LR
    A[Push to main] --> B[CI Pipeline]
    B --> C[Quality: Lint + Typecheck + Build]
    B --> D[API Tests: SQLite + PostgreSQL]
    B --> E[Mock Data Determinism]
    B --> F[Security: CodeQL + Trivy + npm/pip audit]
    C --> G[Release Job]
    D --> G
    E --> G
    F --> G
    G --> H[Semantic Release]
    H --> I[Changelog + Git Tag + npm Publish]
```

### Jobs do Pipeline

| Job         | Descrição                        | Trigger      |
| ----------- | -------------------------------- | ------------ |
| `quality`   | Lint + Typecheck + Build         | Push/PR      |
| `api`       | Testes API (SQLite + PostgreSQL) | Push/PR      |
| `mock-data` | Valida mock data determinism     | Push/PR      |
| `security`  | CodeQL + Trivy + npm/pip audit   | Push/PR      |
| `release`   | Semantic Release (main only)     | Push to main |

### Branch Protection

- `main` protegida: requer 1 approval + all checks pass
- Linear history enforced (squash merge)
- Signed commits required

---

## 📚 Documentação Adicional

| Documento                                   | Descrição                              |
| ------------------------------------------- | -------------------------------------- |
| [ADRs](docs/adr/)                           | Architecture Decision Records (5 ADRs) |
| [Architecture Diagrams](docs/architecture/) | C4 diagrams (Mermaid)                  |
| [Runbooks](docs/runbooks/)                  | Deploy, Incident Response              |
| [Contributing Guide](docs/CONTRIBUTING.md)  | Guia de contribuição                   |

### ADRs Disponíveis

| ID                                         | Título                              | Status   |
| ------------------------------------------ | ----------------------------------- | -------- |
| [001](docs/adr/001-monorepo-workspaces.md) | Monorepo with npm workspaces        | Accepted |
| [002](docs/adr/002-nextjs-proxy.md)        | Next.js proxy for API (avoids CORS) | Accepted |
| [003](docs/adr/003-flat-metrics-table.md)  | SQLAlchemy flat metric_points table | Accepted |
| [004](docs/adr/004-deterministic-seed.md)  | Deterministic seed strategy         | Accepted |
| [005](docs/adr/005-jwt-auth.md)            | JWT stateless authentication        | Accepted |

---

## 🤝 Contribuindo

Leia o [Guia de Contribuição](docs/CONTRIBUTING.md) para detalhes sobre:

- Workflow de branches (`feature/*`, `fix/*`, `docs/*`, `chore/*`)
- Padrão de commits (Conventional Commits)
- Code review checklist
- Code standards (TypeScript, Python, CSS)
- Testing guidelines
- Release process

### Resumo Rápido

```bash
# 1. Crie branch
git checkout -b feature/minha-feature

# 2. Desenvolva + testes
npm test

# 3. Commit semântico
git commit -m "feat(api): adiciona endpoint de métricas agregadas"

# 4. Push + PR
git push origin feature/minha-feature
# Abra PR → 1 approval + all checks pass → squash merge
```

---

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

## 🙏 Agradecimentos

- **FastAPI** - Modern, fast web framework
- **Next.js** - React framework for production
- **SQLAlchemy** - Python SQL toolkit
- **TanStack Query** - Server state management
- **Tailwind CSS** - Utility-first CSS
- **Playwright** - E2E testing
- **Semantic Release** - Automated versioning

---

<div align="center">

**Rootline** — _From incident to root cause._

Made with ❤️ by the Rootline Team

</div>
