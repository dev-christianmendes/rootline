# ROOTLINE

**From incident to root cause.**

Intelligent incident investigation & operations platform. Rootline correlaciona métricas, logs, traces, deployments, serviços e dependências para ajudar engenheiros a investigar incidentes e identificar possíveis causas-raiz.

> **AI doesn't guess. It investigates.**

## Visão geral

O Rootline não substitui ferramentas de observabilidade — ele funciona como uma **camada de investigação e correlação**:

- Visualizar o estado geral dos sistemas
- Identificar incidentes ativos e acompanhar sua evolução temporal
- Consultar métricas, logs, traces e deployments relacionados
- Entender dependências entre serviços
- Executar investigações assistidas com hipóteses, evidências e contrapontos

## Estrutura do monorepo

```text
rootline/
├── apps/
│   └── web/            # Frontend Next.js (App Router) + mock API (route handlers)
├── packages/
│   ├── config/         # Configurações compartilhadas (tsconfig, eslint)
│   ├── types/          # Tipos de domínio compartilhados
│   └── ui/             # Design system (@rootline/ui)
├── data/
│   ├── mock/           # Datasets simulados (services, incidents, metrics, logs, ...)
│   └── scripts/        # Gerador do mock data
└── docs/
```

## Como rodar

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

Outros comandos:

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript (web + packages)
npm run build      # Build de produção Next.js
npm run generate:mock   # Regenera o mock data a partir do gerador
```

## Fase atual

- **Em andamento:** Frontend MVP (Phase 0 + Phase 1) com dados simulados.
- **Próxima:** Backend FastAPI + PostgreSQL, substituindo o mock API.