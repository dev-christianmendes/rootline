# Contributing to Rootline

Thank you for contributing to Rootline! This guide covers our development workflow, coding standards, and review process.

## Quick Start

```bash
# 1. Fork and clone
git clone https://github.com/your-org/rootline.git
cd rootline

# 2. Install dependencies
npm install
cd apps/api && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt

# 3. Start development
npm run dev          # Frontend (localhost:3000)
npm run api:dev      # API (localhost:8000)
npm run infra:up     # PostgreSQL + API (Docker)
```

## Development Workflow

### Branching

- `main` - Protected, deployable
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation only
- `chore/*` - Maintenance, tooling

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `refactor`, `perf`, `security`, `docs`, `chore`, `test`, `build`, `ci`

**Scopes**: `api`, `web`, `types`, `ui`, `config`, `infra`, `mock`, `ci`, `docs`, `deps`, `release`

**Examples**:

```
feat(api): Add pagination to incidents endpoint
fix(web): Handle WebSocket reconnection on network loss
docs(adr): Add ADR 003 for flat metrics table
chore(deps): Update FastAPI to 0.115
```

### Pull Requests

1. **Title**: Follow conventional commits
2. **Description**: What, why, how
3. **Checks**: All CI must pass (lint, typecheck, tests, build)
4. **Review**: 1 approval required
5. **Merge**: Squash and merge (linear history)

## Code Standards

### TypeScript (Frontend)

- Strict mode enabled
- No `any` without justification
- Prefer `interface` over `type` for objects
- Use `const` assertions for literals
- Export types from `packages/types`

### Python (Backend)

- Type hints required (`mypy` strict)
- Black formatting (`black .`)
- Import sorting (`isort .`)
- Docstrings for public functions
- Pydantic models for API schemas

### CSS/Styling

- Tailwind CSS utility classes
- CSS variables for theming
- Mobile-first responsive
- Dark mode by default

## Testing

### Frontend

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests (when added)
npm run test

# E2E tests (when added)
npm run test:e2e
```

### Backend

```bash
cd apps/api

# Type checking (mypy)
.venv/bin/mypy app/

# Tests
.venv/bin/pytest -q

# With coverage
.venv/bin/pytest --cov=app --cov-fail-under=80
```

### Full Test Suite

```bash
# Runs: typecheck + lint + mock validation + API tests
npm test
```

## Mock Data

Regenerate mock data:

```bash
npm run generate:mock
```

Validate mock data matches generator:

```bash
npm run test:mock
```

## Code Review Checklist

### Functionality

- [ ] Solves the stated problem
- [ ] Handles edge cases
- [ ] No regression in existing functionality
- [ ] Proper error handling

### Code Quality

- [ ] Follows project conventions
- [ ] No duplicated code (DRY)
- [ ] Appropriate abstractions
- [ ] No dead code / commented code

### Testing

- [ ] Unit tests for new logic
- [ ] Integration tests for API changes
- [ ] E2E tests for user flows (when applicable)

### Documentation

- [ ] Updated relevant docs
- [ ] ADR added for architectural decisions
- [ ] API docs updated (auto-generated from FastAPI)

### Security

- [ ] No secrets in code
- [ ] Input validation on all endpoints
- [ ] Auth/authorization on mutating endpoints
- [ ] Rate limiting on public endpoints

## Release Process

1. **Create release PR**: `chore(release): vX.Y.Z`
2. **Update version**: `npm version patch|minor|major`
3. **Changelog**: Auto-generated via changesets
4. **Merge to main**: Triggers CI/CD
5. **Deploy**: Automated via GitHub Actions

## Getting Help

- **Questions**: GitHub Discussions
- **Bugs**: GitHub Issues (use templates)
- **Security**: Email security@rootline.com
- **Slack**: #rootline-dev (internal)

## Code of Conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/). Be respectful, inclusive, and constructive.

---

_Thank you for contributing to Rootline! 🚀_
