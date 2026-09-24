# Branch Protection Rules

This document describes the required branch protection rules for the `main` branch in the Rootline repository.

## Required Status Checks

The following status checks must pass before merging to `main`:

| Check Name                        | Job         | Description                                 |
| --------------------------------- | ----------- | ------------------------------------------- |
| `Lint · types · build`            | `quality`   | ESLint, TypeScript typecheck, Next.js build |
| `API tests · SQLite + PostgreSQL` | `api`       | Python tests on both SQLite and PostgreSQL  |
| `Mock data determinism`           | `mock-data` | Validates mock data matches generator       |

## Branch Protection Settings

Configure these settings in GitHub: **Settings → Branches → Branch protection rules → Add rule**

### Branch name pattern

```
main
```

### Protect matching branches

✅ **Require a pull request before merging**

- ✅ Require approvals: **1**
- ✅ Dismiss stale PR approvals when new commits are pushed
- ✅ Require review from code owners (when CODEOWNERS file exists)

✅ **Require status checks to pass before merging**

- ✅ Require branches to be up to date before merging
- Required status checks:
  - `Lint · types · build`
  - `API tests · SQLite + PostgreSQL`
  - `Mock data determinism`

✅ **Require conversation resolution before merging**

✅ **Require signed commits** (optional, recommended for production)

✅ **Require linear history** (prevents merge commits, enforces squash/rebase)

✅ **Do not allow bypassing the above settings**

### Restrictions

- ✅ **Restrict who can push to matching branches**: Only repository administrators
- ✅ **Allow force pushes**: **No**
- ✅ **Allow deletions**: **No**

## Automated Configuration (via GitHub CLI)

```bash
# Enable branch protection for main
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Lint · types · build","API tests · SQLite + PostgreSQL","Mock data determinism"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions='{"users":[],"teams":[]}' \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_linear_history=true \
  --field required_conversation_resolution=true
```

## CODEOWNERS

Create `.github/CODEOWNERS` to require reviews from specific teams:

```text
# Global owners
* @chris

# API owners
/apps/api/ @backend-team

# Frontend owners
/apps/web/ @frontend-team
/packages/ui/ @frontend-team

# Infrastructure
/.github/ @devops-team
/docker-compose.yml @devops-team
```

## Rationale

1. **Linear history** - Makes git history readable, bisect works correctly
2. **Required reviews** - Ensures code quality and knowledge sharing
3. **Status checks** - Prevents broken code from reaching main
4. **Conversation resolution** - Forces addressing all review comments
5. **No force pushes** - Protects history integrity

## Emergency Override

In case of critical production issues, repository administrators can:

1. Temporarily disable branch protection
2. Push hotfix directly to main
3. Re-enable protection immediately after

Document any emergency overrides in the release notes.
