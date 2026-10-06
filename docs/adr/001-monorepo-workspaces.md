# ADR 001: Monorepo with npm workspaces

## Status

Accepted

## Context

Rootline is a full-stack application with a FastAPI backend and Next.js frontend, plus shared TypeScript types and UI components. We need to manage these as a single repository while maintaining clear separation of concerns.

Key requirements:

- Shared TypeScript types between frontend and backend
- Shared UI component library
- Independent deployment of frontend and backend
- Simple dependency management
- Fast CI/CD with minimal configuration

## Decision

We will use a monorepo structure with npm workspaces:

```
rootline/
├── apps/
│   ├── api/          # FastAPI backend (Python)
│   └── web/          # Next.js frontend (TypeScript)
├── packages/
│   ├── config/       # Shared config (tsconfig, eslint)
│   ├── types/        # Shared TypeScript types
│   └── ui/           # Shared React UI components
├── data/             # Mock data and generators
└── docs/             # Documentation
```

Root `package.json` defines workspaces: `["apps/*", "packages/*"]`.

## Consequences

### Positive

- Single `npm install` installs all dependencies
- Atomic commits across frontend/backend/packages
- Easy code sharing via `npm link`-free imports (`@rootline/types`, `@rootline/ui`)
- Simplified CI/CD (single pipeline)
- Easy refactoring across package boundaries

### Negative

- All packages share Node.js version (enforced via `engines`)
- Larger `node_modules` (mitigated by npm workspaces hoisting)
- Potential for coupling if not disciplined about package boundaries

### Neutral

- Requires npm 7+ (standard since 2021)
- Python backend managed separately (pip/venv)

## Alternatives Considered

### Separate Repositories

- Pros: Complete isolation, independent versioning
- Cons: Complex dependency sharing, multiple PRs for cross-cutting changes, complex CI/CD coordination

### Yarn Workspaces / pnpm

- Pros: Faster installs, better disk usage
- Cons: Team familiarity with npm, additional tooling

### Nx / Turborepo

- Pros: Advanced caching, affected commands, distributed execution
- Cons: Overkill for current scale, additional learning curve

## References

- [npm workspaces documentation](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [Monorepo vs polyrepo discussion](https://monorepo.tools/)
