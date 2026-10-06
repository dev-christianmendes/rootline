# ADR 004: Deterministic Seed Strategy

## Status

Accepted

## Context

Rootline needs realistic mock data for development, demos, and CI/CD. The seed data must be:

- **Deterministic** - Same output every run for CI reproducibility
- **Realistic** - Represents real incident scenarios with correlations
- **Idempotent** - Safe to re-run without duplicating data
- **Fast** - Seeds in <5 seconds

## Decision

Use a deterministic seed generator with fixed seed:

```javascript
// data/scripts/generate-mock.mjs
const rnd = mulberry32(20260924); // Fixed seed
const BASE_ISO = process.env.MOCK_BASE_DATE ?? "2026-09-24"; // Fixed date
```

Seed generator produces:

- 12 services with dependencies
- 4 incidents with timelines
- Metrics with realistic incident patterns (spikes at specific times)
- Structured logs with trace IDs
- Deployments with realistic timing
- Traces with span hierarchies
- AI hypotheses with evidence/counter-evidence

**Idempotent seeding**: `seed()` checks `SELECT COUNT(*) FROM services` - only seeds if empty. Force flag available for CI.

## Consequences

### Positive

- **CI reproducibility** - `npm run test:mock` validates no diff vs generator
- **Deterministic demos** - Same scenario every time
- **Fast CI** - Generator runs in ~200ms
- **Realistic correlations** - Deployment → metric spike → logs → traces → hypothesis
- **Idempotent** - Safe to run on every app start

### Negative

- **Fixed timestamp** - All data anchored to 2026-09-24 (configurable via `MOCK_BASE_DATE`)
- **Static scenarios** - No random variation between runs
- **Manual updates** - New scenarios require generator edits

### Neutral

- Generator is the source of truth; JSON files are artifacts
- CI validates `npm run test:mock` passes (no diff)

## Alternatives Considered

### SQL Seed Files

- Rejected: Hard to maintain correlations across tables; no programmatic generation

### Faker.js Random Data

- Rejected: Non-deterministic breaks CI; unrealistic correlations

### Database Dump

- Rejected: Not portable across PostgreSQL versions; hard to update

### Factory Bot / Factory Pattern

- Rejected: Overhead for static mock data; better for dynamic test factories

## References

- [mulberry32 PRNG](https://github.com/bryc/code/blob/master/jshash/PRNGs.md)
- [Deterministic testing practices](https://martinfowler.com/bliki/DeterministicTest.html)
