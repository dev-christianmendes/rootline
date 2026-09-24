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
│   ├── api/            # Backend FastAPI + PostgreSQL (SQLAlchemy)
│   └── web/            # Frontend Next.js (App Router), faz proxy para a API
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

O frontend e a API são processos separados. Suba a API primeiro.

```bash
npm install
npm run infra:up   # sobe PostgreSQL + API em Docker
npm run dev        # frontend em http://localhost:3000
```

O frontend fala com a API no mesmo origin em `/api/v1`; o Next faz o proxy
server side, então não há CORS no caminho. Para apontar para outra API use
`ROOTLINE_API_URL`:

```bash
ROOTLINE_API_URL=http://localhost:8080 npm run dev
```

### Comandos

```bash
npm run infra:up       # sobe API + Postgres (build da imagem)
npm run infra:down     # derruba os containers (preserva o volume)
npm run infra:reset    # derruba e recria o volume, reseedando o banco
npm run infra:logs     # logs da API

npm run dev            # Next.js em modo desenvolvimento
npm run build          # Build de produção Next.js
npm run lint           # ESLint
npm run typecheck      # TypeScript (web + packages)
npm run generate:mock  # Regenera o mock data a partir do gerador

npm run api:install    # venv local em apps/api/.venv
npm run api:dev        # uvicorn local em http://localhost:8000
npm run api:test       # suíte de testes da API
npm run test:mock      # falha se o mock data estiver fora do gerador
npm test               # typecheck + lint + mock data + API
```

### Backend sem Docker

```bash
npm run api:install
npm run api:dev
```

Por padrão a API conecta no PostgreSQL em `localhost:5432`. Para rodar sem
banco, aponte para um SQLite local:

```bash
export ROOTLINE_DATABASE_URL="sqlite:///apps/api/rootline.db"
npm run api:dev
```

Na primeira inicialização a API cria o schema e popula o banco a partir de
`data/mock/`. O seed é idempotente: só roda quando as tabelas estão vazias. Para
forçar de novo, use `npm run infra:reset`.

### Contrato da API

Todos os endpoints ficam sob `/api/v1`:

| Método | Rota                      | Descrição                                          |
| ------ | ------------------------- | -------------------------------------------------- |
| GET    | `/health`                 | Liveness da API                                    |
| GET    | `/system/health`          | aggregating view de serviços e incidentes          |
| GET    | `/services`               | Serviços na ordem curada                           |
| GET    | `/services/{id}`          | Um serviço                                         |
| GET    | `/services/{id}/metrics`  | Série temporal, filtrável por `name` e `from`/`to` |
| GET    | `/incidents`              | Incidentes, mais recentes primeiro                 |
| POST   | `/incidents`              | Cria incidente                                     |
| GET    | `/incidents/{id}`         | Um incidente                                       |
| PATCH  | `/incidents/{id}`         | Atualiza status, responsável, resolução            |
| GET    | `/incidents/{id}/logs`    | Logs do incidente, filtrável por `level` e `q`     |
| GET    | `/incidents/{id}/traces`  | Traces do incidente                                |
| POST   | `/incidents/{id}/analyze` | Análise de um incidente existente                  |
| GET    | `/deployments`            | Deployments na ordem de houve                      |
| GET    | `/investigations`         | Investigações                                      |
| GET    | `/investigations/{id}`    | Uma investigação                                   |

Documentação interativa em `http://localhost:8000/docs`.

### Testes

A suíte da API roda sem infraestrutura por padrão, contra um SQLite temporário.
Apontando `ROOTLINE_TEST_DATABASE_URL` a mesma suíte roda contra o PostgreSQL,
o que o CI faz para pegar o que o SQLite não impõe (ordem de insert, dialects):

```bash
npm run api:test

ROOTLINE_TEST_DATABASE_URL="postgresql+psycopg://rootline:rootline@localhost:5433/rootline_test" \
  apps/api/.venv/bin/python -m pytest apps/api -q
```

## Fase atual

- **Pronto:** Frontend MVP, backend FastAPI + PostgreSQL, datasets gerados e
  testados, e o botão _New incident_ criando incidentes de verdade.
- **Não implementado:** autenticação, migrações de schema (a API usa
  `create_all` + seed) e a análise de incidentes recém-criados, que ainda
  depende de uma investigação pré-existente.
