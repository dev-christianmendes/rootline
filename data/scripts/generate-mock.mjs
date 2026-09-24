#!/usr/bin/env node
/*
 * ROOTLINE — Mock data generator
 *
 * Produces the simulated datasets inside data/mock (spec §22 & §36).
 * Deterministic: uses a seeded PRNG so every run yields the same output.
 *
 * Demo scenario (spec §36):
 *   14:02 Payment Service v2.8.1 deployed
 *   14:05 latency increases
 *   14:06 HTTP 500 spike
 *   14:08 P1 incident created
 *   14:09 investigation begins
 *   14:10 correlation deployment + errors
 *   14:11 AI hypothesis generated
 *   14:12 engineer reviews evidence
 *
 *   INC-2391 is the canonical incident (spec §17).
 *
 * Run: node data/scripts/generate-mock.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "mock");

/* ------------------------------------------------------------------ */
/* Deterministic PRNG                                                  */
/* ------------------------------------------------------------------ */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20260924);
const noise = (amp) => () => (rnd() * 2 - 1) * amp;

const ISO = (d) => d.toISOString();

/* ------------------------------------------------------------------ */
/* Time helpers — everything is UTC, anchored to a FIXED date          */
/* ------------------------------------------------------------------ */
/*
 * The scenario anchor must be a literal constant, not derived from
 * new Date(): the CI "mock-data determinism" job regenerates the dataset
 * and asserts no diff, so a wall-clock anchor would break it on any day
 * other than the generation day. Override with MOCK_BASE_DATE=YYYY-MM-DD
 * for date-shifted local development.
 */
const BASE_ISO = process.env.MOCK_BASE_DATE ?? "2026-09-24";
if (!/^\d{4}-\d{2}-\d{2}$/.test(BASE_ISO)) {
  throw new Error(`MOCK_BASE_DATE must be YYYY-MM-DD, got "${BASE_ISO}"`);
}
const [BY, BM, BD] = BASE_ISO.split("-").map(Number);
const DAY = Date.UTC(BY, BM - 1, BD);
const at = (h, m, s = 0) => ISO(new Date(DAY + ((h * 60 + m) * 60 + s) * 1000));

const BASE = at(13, 50);

/* ------------------------------------------------------------------ */
/* Services (spec §16, §19)                                            */
/* ------------------------------------------------------------------ */
const services = [
  {
    id: "frontend-web",
    name: "Frontend Web",
    description: "Web application served to end users (Next.js).",
    kind: "frontend",
    team: "Platform",
    version: "v6.1.0",
    health: "healthy",
    latencyMs: 62,
    errorRate: 0.06,
    availability: 99.99,
    p95LatencyMs: 160,
    dependencies: ["api-gateway"],
  },
  {
    id: "api-gateway",
    name: "API Gateway",
    description: "Edge gateway routing traffic to backend APIs.",
    kind: "gateway",
    team: "Platform",
    version: "v2.3.1",
    health: "healthy",
    latencyMs: 84,
    errorRate: 0.12,
    availability: 99.99,
    p95LatencyMs: 210,
    dependencies: ["auth-api", "payment-api", "catalog-api", "checkout-api"],
  },
  {
    id: "auth-api",
    name: "Auth API",
    description: "Authentication and session management.",
    kind: "api",
    team: "Identity",
    version: "v3.4.0",
    health: "degraded",
    latencyMs: 312,
    errorRate: 1.4,
    availability: 99.82,
    p95LatencyMs: 780,
    dependencies: ["redis-cache", "postgres-primary"],
  },
  {
    id: "payment-api",
    name: "Payment API",
    description: "Payment processing, checkout and refunds.",
    kind: "api",
    team: "Payments",
    version: "v2.8.1",
    health: "critical",
    latencyMs: 483,
    errorRate: 3.8,
    availability: 99.41,
    p95LatencyMs: 1240,
    dependencies: ["postgres-primary", "redis-cache", "kafka-bus"],
  },
  {
    id: "catalog-api",
    name: "Catalog API",
    description: "Product catalog and search.",
    kind: "api",
    team: "Commerce",
    version: "v4.2.0",
    health: "healthy",
    latencyMs: 96,
    errorRate: 0.18,
    availability: 99.95,
    p95LatencyMs: 240,
    dependencies: ["postgres-primary", "redis-cache"],
  },
  {
    id: "checkout-api",
    name: "Checkout API",
    description: "Checkout orchestration and order creation.",
    kind: "api",
    team: "Commerce",
    version: "v1.9.2",
    health: "degraded",
    latencyMs: 268,
    errorRate: 1.1,
    availability: 99.71,
    p95LatencyMs: 640,
    dependencies: ["payment-api", "postgres-primary"],
  },
  {
    id: "notification-worker",
    name: "Notification Worker",
    description: "Async email and push notification delivery.",
    kind: "worker",
    team: "Engagement",
    version: "v2.1.3",
    health: "healthy",
    latencyMs: 45,
    errorRate: 0.04,
    availability: 99.98,
    p95LatencyMs: 130,
    dependencies: ["kafka-bus", "postgres-primary"],
  },
  {
    id: "search-indexer",
    name: "Search Indexer",
    description: "Consumes events to build and refresh the product search index.",
    kind: "worker",
    team: "Commerce",
    version: "v1.4.1",
    health: "healthy",
    latencyMs: 38,
    errorRate: 0.06,
    availability: 99.92,
    p95LatencyMs: 120,
    dependencies: ["kafka-bus"],
  },
  {
    id: "postgres-primary",
    name: "PostgreSQL",
    description: "Primary relational database (OLTP).",
    kind: "data",
    team: "Data Infrastructure",
    version: "16.3",
    health: "healthy",
    latencyMs: 88,
    errorRate: 0.0,
    availability: 99.99,
    p95LatencyMs: 190,
    dependencies: [],
  },
  {
    id: "redis-cache",
    name: "Redis",
    description: "Distributed cache and ephemeral state.",
    kind: "cache",
    team: "Data Infrastructure",
    version: "7.2",
    health: "healthy",
    latencyMs: 12,
    errorRate: 0.0,
    availability: 99.99,
    p95LatencyMs: 30,
    dependencies: [],
  },
  {
    id: "kafka-bus",
    name: "Kafka",
    description: "Event bus for asynchronous workflows.",
    kind: "message_bus",
    team: "Data Infrastructure",
    version: "3.7",
    health: "healthy",
    latencyMs: 18,
    errorRate: 0.01,
    availability: 99.97,
    p95LatencyMs: 60,
    dependencies: [],
  },
];

/* ------------------------------------------------------------------ */
/* Incidents (spec §13–§15, §17, §36)                                  */
/* ------------------------------------------------------------------ */
const incidents = [
  {
    id: "INC-2391",
    title: "Payment API returning HTTP 500",
    description:
      "The Payment API is experiencing an increase in HTTP 500 responses, affecting the /checkout flow. Onset began minutes after deployment v2.8.1.",
    severity: "P1",
    status: "INVESTIGATING",
    serviceId: "payment-api",
    assignee: "L. Chen",
    startedAt: at(14, 6),
    detectedAt: at(14, 8),
    impact:
      "~12% of payment requests failing and checkout latency up to 4x. Checkout flow partially degraded.",
    summary:
      "HTTP 500 spike on Payment API detected 4 minutes after deployment v2.8.1. Authorize-payment step is the primary failing operation.",
    timeline: [
      {
        time: at(14, 2),
        type: "deployment",
        title: "Deployment v2.8.1",
        detail: "payment-api v2.8.1 released by J. Chen (commit a1b2c3d).",
      },
      {
        time: at(14, 5),
        type: "metric",
        title: "Latency begins increasing",
        detail: "payment-api p50 latency rising from ~90ms toward 190ms.",
      },
      {
        time: at(14, 6),
        type: "metric",
        title: "HTTP 500 spike detected",
        detail: "Error rate jumps +38%; /checkout is the most affected endpoint.",
      },
      {
        time: at(14, 8),
        type: "incident",
        title: "Incident created",
        detail: "Rootline detected the anomaly and opened INC-2391 (P1).",
      },
      {
        time: at(14, 10),
        type: "investigation",
        title: "Investigation started",
        detail: "Correlation engine linked deployment v2.8.1 + error rate + /checkout.",
      },
      {
        time: at(14, 11),
        type: "investigation",
        title: "AI hypothesis generated",
        detail: "Strongest correlation: recent deployment to payment-api (82% confidence).",
      },
      {
        time: at(14, 12),
        type: "action",
        title: "Engineer reviewing evidence",
        detail: "L. Chen inspecting deployment diff and affected endpoint traces.",
      },
    ],
    affectedServices: [
      { serviceId: "payment-api", impact: "HTTP 500 spike, high latency" },
      { serviceId: "checkout-api", impact: "Elevated latency due to payment dependency" },
    ],
  },
  {
    id: "INC-2390",
    title: "Auth API increased latency",
    description:
      "Session validation calls on Auth API are ~2.5x slower than baseline, increasing login and token refresh times.",
    severity: "P2",
    status: "MONITORING",
    serviceId: "auth-api",
    assignee: "M. Silva",
    startedAt: at(13, 20),
    detectedAt: at(13, 22),
    impact: "Login and token refresh slower for a subset of users.",
    summary:
      "Latency degradation on auth-api, currently being monitored after mitigation.",
    timeline: [
      { time: at(13, 20), type: "metric", title: "Latency degradation", detail: "auth-api p95 crossing 700ms." },
      { time: at(13, 22), type: "incident", title: "Incident created", detail: "INC-2390 opened as P2." },
      { time: at(13, 25), type: "investigation", title: "Investigation started", detail: "Correlated with Redis cache miss rate increase." },
      { time: at(13, 40), type: "action", title: "Cache warming", detail: "M. Silva warmed session cache; latency stabilized." },
      { time: at(13, 48), type: "system", title: "Monitoring", detail: "Incident moved to MONITORING." },
    ],
    affectedServices: [{ serviceId: "auth-api", impact: "Elevated latency (p95 ~780ms)" }],
  },
  {
    id: "INC-2389",
    title: "Catalog search degradation",
    description:
      "Product search under degraded performance returning partial results during index refresh.",
    severity: "P3",
    status: "MITIGATING",
    serviceId: "catalog-api",
    assignee: "A. Kumar",
    startedAt: at(12, 5),
    detectedAt: at(12, 7),
    impact: "Search slow for a fraction of catalog traffic.",
    summary:
      "Partial search results while the index is refreshed. Mitigation in progress.",
    timeline: [
      { time: at(12, 5), type: "metric", title: "Search degradation", detail: "Catalog search p95 > 800ms." },
      { time: at(12, 7), type: "incident", title: "Incident created", detail: "INC-2389 opened as P3." },
      { time: at(12, 30), type: "action", title: "Index rebuild", detail: "A. Kumar triggered full index rebuild." },
    ],
    affectedServices: [{ serviceId: "catalog-api", impact: "Degraded search" }],
  },
  {
    id: "INC-2388",
    title: "Search index lag",
    description:
      "Search indexer fell behind on event consumption, causing stale products in search for ~40 minutes.",
    severity: "P4",
    status: "RESOLVED",
    serviceId: "search-indexer",
    assignee: "J. Oliveira",
    startedAt: at(9, 30),
    detectedAt: at(9, 44),
    resolvedAt: at(10, 12),
    impact: "Low impact — search results stale for a short window.",
    summary: "Consumer lag on search indexer resolved by rebalancing partitions.",
    timeline: [
      { time: at(9, 30), type: "system", title: "Consumer lag", detail: "search-indexer lag growing on kafka-bus." },
      { time: at(9, 44), type: "incident", title: "Incident created", detail: "INC-2388 opened as P4." },
      { time: at(9, 55), type: "action", title: "Partitions rebalanced", detail: "J. Oliveira rebalanced consumer group." },
      { time: at(10, 12), type: "resolution", title: "Incident resolved", detail: "Lag back to zero; search healthy." },
    ],
    affectedServices: [{ serviceId: "search-indexer", impact: "Stale search index" }],
    resolution: {
      rootCause: "Consumer group imbalance on the search indexer",
      summary: "Rebalanced partitions; lag recovered to 0.",
      resolvedBy: "J. Oliveira",
      resolvedAt: at(10, 12),
      mitigation: "Added alert for consumer lag threshold.",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */
const T0 = new Date(BASE).getTime();
const STEP = 60 * 1000;
const POINTS = 46; // 13:50 -> 14:35

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function series(serviceId, metric, unit, fn) {
  const points = [];
  for (let i = 0; i < POINTS; i++) {
    const t = new Date(T0 + i * STEP);
    points.push({ timestamp: ISO(t), value: Number(clamp(fn(i, t), 0, 1e9).toFixed(3)) });
  }
  return { serviceId, metric, unit, points };
}

const minutesFrom = (i) => 13 * 60 + 50 + i; // absolute minutes of day for timestep i

const metrics = [];

// payment-api — the incident service
metrics.push(
  series("payment-api", "latency_ms", "ms", (i) => {
    const m = minutesFrom(i);
    if (m < 14 * 60 + 2) return 88 + noise(5)();
    if (m < 14 * 60 + 5) return 92 + (m - 14 * 60) * 18 + noise(6)();
    if (m < 14 * 60 + 6) return 190 + noise(15)();
    if (m < 14 * 60 + 7) return 420 + noise(25)();
    return 460 + noise(40)();
  }),
  series("payment-api", "error_rate", "%", (i) => {
    const m = minutesFrom(i);
    if (m < 14 * 60 + 6) return 0.18 + noise(0.06)();
    if (m < 14 * 60 + 7) return 2.4 + noise(0.3)();
    if (m < 14 * 60 + 8) return 3.6 + noise(0.4)();
    return 3.3 + noise(0.7)();
  }),
  series("payment-api", "request_rate", "req/s", (i) => {
    const m = minutesFrom(i);
    const base = 1240 + noise(60)();
    if (m >= 14 * 60 + 6) return base * (0.9 - (m - 14 * 60 - 6) * 0.004);
    return base;
  }),
  series("payment-api", "cpu_usage", "%", (i) => {
    const m = minutesFrom(i);
    if (m < 14 * 60 + 4) return 32 + noise(4)();
    if (m < 14 * 60 + 8) return 58 + (m - 14 * 60 - 4) * 3 + noise(5)();
    return 66 + noise(8)();
  }),
  series("payment-api", "memory_usage", "%", (i) => {
    const m = minutesFrom(i);
    if (m < 14 * 60 + 4) return 55 + noise(1.5)();
    return 61 + noise(2)();
  }),
);

// auth-api — degraded but monitoring
metrics.push(
  series("auth-api", "latency_ms", "ms", (i) => {
    const m = minutesFrom(i);
    if (m < 13 * 60 + 40) return 300 + noise(18)();
    return 96 + noise(10)();
  }),
  series("auth-api", "error_rate", "%", (i) => {
    const m = minutesFrom(i);
    if (m < 13 * 60 + 40) return 1.3 + noise(0.2)();
    return 0.2 + noise(0.05)();
  }),
);

/*
 * Remaining services. Every service in services.json gets at least a latency
 * and an error-rate series so no service detail page renders an empty chart.
 * Window is 13:50 -> 14:35, so in-window values reflect the *current* state of
 * each incident: catalog-api is still MITIGATING (degraded), while auth-api
 * and search-indexer have already recovered.
 */
for (const [sid, baseLat, baseErr] of [
  ["api-gateway", 84, 0.12],
  ["checkout-api", 268, 1.1],
  ["frontend-web", 142, 0.22],
  ["notification-worker", 18, 0.05],
  ["search-indexer", 210, 0.14],
  ["postgres-primary", 190, 0.04],
  ["redis-cache", 12, 0.01],
  ["kafka-bus", 4, 0.02],
]) {
  metrics.push(
    series(sid, "latency_ms", "ms", () => baseLat + noise(8)()),
    series(sid, "error_rate", "%", () => baseErr + noise(0.05)()),
  );
}

// catalog-api — still degraded (status MITIGATING), index rebuild in progress
metrics.push(
  series("catalog-api", "latency_ms", "ms", (i) => {
    const m = minutesFrom(i);
    if (m < 14 * 60 + 10) return 96 + noise(8)();
    return 640 + noise(70)();
  }),
  series("catalog-api", "error_rate", "%", (i) => {
    const m = minutesFrom(i);
    if (m < 14 * 60 + 10) return 0.18 + noise(0.05)();
    return 1.9 + noise(0.35)();
  }),
);

// capacity signals for the infrastructure services the narrative references
metrics.push(
  series("postgres-primary", "cpu_usage", "%", () => 41 + noise(5)()),
  series("postgres-primary", "memory_usage", "%", () => 63 + noise(3)()),
  series("redis-cache", "cpu_usage", "%", () => 22 + noise(3)()),
  series("redis-cache", "memory_usage", "%", () => 47 + noise(2)()),
  series("kafka-bus", "request_rate", "msg/s", () => 18400 + noise(700)()),
);

/* ------------------------------------------------------------------ */
/* Logs (structured, JetBrains Mono-friendly)                          */
/* ------------------------------------------------------------------ */
const logs = [
  // payment-api — around the incident
  { serviceId: "payment-api", incidentId: "INC-2391", level: "info", t: [14, 2, 9], message: "deployment v2.8.1 complete", f: { version: "v2.8.1", commit: "a1b2c3d", author: "j.chen" } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "info", t: [14, 2, 15], message: "started 8 replicas / 256MB reserved", f: { replicas: 8 } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "warn", t: [14, 5, 2], message: "p50 latency above threshold", f: { metric: "latency_ms", value: 138 } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "warn", t: [14, 5, 41], message: "connection pool 78% consumed", f: { pool: "checkout-sessions", usage: 78 } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "error", t: [14, 6, 2], message: "http 500 POST /checkout", f: { status: 500, path: "/checkout", trace: "t-9c2f1a" } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "error", t: [14, 6, 9], message: "http 500 POST /checkout", f: { status: 500, path: "/checkout", trace: "t-7b3d0e" } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "error", t: [14, 6, 18], message: "authorize failed psycopg2.OperationalError connection reset", f: { operation: "authorize", error: "connection_reset", trace: "t-9c2f1a" } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "error", t: [14, 6, 33], message: "authorize failed psycopg2.OperationalError connection reset", f: { operation: "authorize", error: "connection_reset" } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "error", t: [14, 7, 4], message: "http 500 POST /checkout", f: { status: 500, path: "/checkout" } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "warn", t: [14, 7, 22], message: "pool exhausted retrying", f: { pool: "checkout-sessions", retries: 3 } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "error", t: [14, 7, 48], message: "http 500 POST /checkout", f: { status: 500, path: "/checkout" } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "info", t: [14, 8, 1], message: "incident INC-2391 opened by rootline", f: { severity: "P1", detected: true } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "info", t: [14, 8, 30], message: "investigation INC-2391 started", f: { engine: "correlation" } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "info", t: [14, 10, 4], message: "correlated deployment v2.8.1 -> /checkout", f: { ref: "dep-pay-281", endpoint: "/checkout" } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "info", t: [14, 11, 12], message: "hypothesis generated deployment v2.8.1 conf=0.82", f: { confidence: 0.82, hypothesis: "h-deploy-281" } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "info", t: [14, 9, 40], message: "opened by l.chen", f: { assignee: "l.chen" } },
  { serviceId: "payment-api", incidentId: "INC-2391", level: "info", t: [14, 12, 5], message: "l.chen viewing deployment diff v2.8.0..v2.8.1", f: { diff: "12 files changed" } },
  // auth-api
  { serviceId: "auth-api", incidentId: "INC-2390", level: "warn", t: [13, 20, 15], message: "session validation slow cache miss", f: { k: "session-cache", hit: false, ms: 640 } },
  { serviceId: "auth-api", incidentId: "INC-2390", level: "warn", t: [13, 20, 58], message: "session validation slow cache miss", f: { k: "session-cache", hit: false, ms: 711 } },
  { serviceId: "auth-api", incidentId: "INC-2390", level: "info", t: [13, 40, 12], message: "cache warmed by m.silva", f: { action: "warm" } },
  // backdrop
  { serviceId: "catalog-api", incidentId: "INC-2389", level: "warn", t: [12, 5, 20], message: "search p95 degraded", f: { p95: 840 } },
  { serviceId: "search-indexer", incidentId: "INC-2388", level: "warn", t: [9, 30, 0], message: "consumer lag growing", f: { lag: 12000, partition: 4 } },
  { serviceId: "search-indexer", incidentId: "INC-2388", level: "info", t: [9, 55, 0], message: "partitions rebalanced", f: { group: "search-indexer" } },
  { serviceId: "api-gateway", level: "info", t: [14, 5, 55], message: "route error rate rising for /checkout", f: { route: "/checkout", pct: 3.1 } },
  { serviceId: "postgres-primary", level: "info", t: [14, 6, 10], message: "latency stable p95=190ms", f: { p95: 190, cpu: 41 } },
  { serviceId: "redis-cache", level: "info", t: [14, 6, 10], message: "hits healthy 99.1%", f: { hit_rate: 99.1 } },
];

function logEntry(idx) {
  const l = logs[idx];
  return {
    id: `log-${String(idx + 1).padStart(3, "0")}`,
    serviceId: l.serviceId,
    incidentId: l.incidentId,
    timestamp: at(...l.t),
    level: l.level,
    message: l.message,
    fields: l.f,
  };
}

/* ------------------------------------------------------------------ */
/* Deployments (spec §22 / Deployment Timeline)                        */
/* ------------------------------------------------------------------ */
const deployments = [
  {
    id: "dep-pay-281",
    serviceId: "payment-api",
    version: "v2.8.1",
    startedAt: at(14, 1, 58),
    finishedAt: at(14, 2, 10),
    status: "deployed",
    author: "J. Chen",
    commit: "a1b2c3d",
    description: "Increase checkout retry backoff + cache checkout session across replicas.",
  },
  {
    id: "dep-pay-280",
    serviceId: "payment-api",
    version: "v2.8.0",
    startedAt: at(13, 55, 2),
    finishedAt: at(13, 55, 40),
    status: "deployed",
    author: "J. Chen",
    commit: "f41e7aa",
    description: "Add authorize step correlation ids for tracing.",
  },
  {
    id: "dep-auth-114",
    serviceId: "auth-api",
    version: "v3.4.0",
    startedAt: at(11, 30, 0),
    finishedAt: at(11, 30, 55),
    status: "deployed",
    author: "T. Nunes",
    commit: "0c9d3f1",
    description: "Session token rotation policy update.",
  },
  {
    id: "dep-cat-90",
    serviceId: "catalog-api",
    version: "v4.2.0",
    startedAt: at(10, 15, 0),
    finishedAt: at(10, 15, 32),
    status: "deployed",
    author: "A. Kumar",
    commit: "7b2cc99",
    description: "Search relevance tuning and facet caching.",
  },
  {
    id: "dep-fw-57",
    serviceId: "frontend-web",
    version: "v6.1.0",
    startedAt: at(9, 40, 0),
    finishedAt: at(9, 40, 25),
    status: "deployed",
    author: "P. Rossi",
    commit: "3aa1db4",
    description: "Checkout entry point redesign (A/B rollout 50%).",
  },
  {
    id: "dep-chk-19",
    serviceId: "checkout-api",
    version: "v1.9.2",
    startedAt: at(8, 5, 0),
    finishedAt: at(8, 5, 18),
    status: "deployed",
    author: "S. Kim",
    commit: "d99e00c",
    description: "Order confirmation event schema bump.",
  },
];

/* ------------------------------------------------------------------ */
/* Traces                                                              */
/* ------------------------------------------------------------------ */
const traces = [
  {
    traceId: "t-9c2f1a",
    incidentId: "INC-2391",
    serviceId: "payment-api",
    name: "POST /checkout",
    operation: "/checkout",
    startedAt: at(14, 6, 12),
    durationMs: 1423,
    status: "error",
    spans: [
      { spanId: "sp-root", name: "serve /checkout", service: "api-gateway", operation: "http", startedAt: at(14, 6, 12), durationMs: 1423, status: "ok" },
      { spanId: "sp-pay", parentSpanId: "sp-root", name: "process checkout", service: "payment-api", operation: "checkout.process", startedAt: at(14, 6, 12), durationMs: 1390, status: "ok" },
      { spanId: "sp-auth", parentSpanId: "sp-pay", name: "authorize payment", service: "payment-api", operation: "payment.authorize", startedAt: at(14, 6, 12), durationMs: 1290, status: "error", error: "psycopg2.OperationalError: connection reset" },
      { spanId: "sp-db", parentSpanId: "sp-auth", name: "commit transaction", service: "postgres-primary", operation: "sql.transaction", startedAt: at(14, 6, 12), durationMs: 1280, status: "error", error: "read from connection before ready" },
    ],
  },
  {
    traceId: "t-7b3d0e",
    incidentId: "INC-2391",
    serviceId: "payment-api",
    name: "POST /checkout",
    operation: "/checkout",
    startedAt: at(14, 6, 49),
    durationMs: 1187,
    status: "error",
    spans: [
      { spanId: "sp-root2", name: "serve /checkout", service: "api-gateway", operation: "http", startedAt: at(14, 6, 49), durationMs: 1187, status: "ok" },
      { spanId: "sp-pay2", parentSpanId: "sp-root2", name: "process checkout", service: "payment-api", operation: "checkout.process", startedAt: at(14, 6, 49), durationMs: 1155, status: "ok" },
      { spanId: "sp-auth2", parentSpanId: "sp-pay2", name: "authorize payment", service: "payment-api", operation: "payment.authorize", startedAt: at(14, 6, 49), durationMs: 1090, status: "error", error: "psycopg2.OperationalError: connection reset" },
      { spanId: "sp-db2", parentSpanId: "sp-auth2", name: "commit transaction", service: "postgres-primary", operation: "sql.transaction", startedAt: at(14, 6, 49), durationMs: 1075, status: "error", error: "server closed the connection unexpectedly" },
    ],
  },
  {
    traceId: "t-880f1b",
    serviceId: "checkout-api",
    name: "POST /checkout",
    operation: "/checkout",
    startedAt: at(13, 58, 22),
    durationMs: 312,
    status: "ok",
    spans: [
      { spanId: "sp-o1", name: "serve /checkout", service: "api-gateway", operation: "http", startedAt: at(13, 58, 22), durationMs: 312, status: "ok" },
      { spanId: "sp-o2", parentSpanId: "sp-o1", name: "process checkout", service: "checkout-api", operation: "checkout.process", startedAt: at(13, 58, 22), durationMs: 210, status: "ok" },
      { spanId: "sp-o3", parentSpanId: "sp-o2", name: "authorize payment", service: "payment-api", operation: "payment.authorize", startedAt: at(13, 58, 22), durationMs: 180, status: "ok" },
    ],
  },
  // INC-2390 — auth-api slow session validation (cache miss path)
  {
    traceId: "t-4a1d7c",
    incidentId: "INC-2390",
    serviceId: "auth-api",
    name: "POST /session/validate",
    operation: "/session/validate",
    startedAt: at(13, 20, 15),
    durationMs: 918,
    status: "error",
    spans: [
      { spanId: "sp-au1", name: "serve /session/validate", service: "api-gateway", operation: "http", startedAt: at(13, 20, 15), durationMs: 918, status: "ok" },
      { spanId: "sp-au2", parentSpanId: "sp-au1", name: "validate session", service: "auth-api", operation: "session.validate", startedAt: at(13, 20, 15), durationMs: 884, status: "error", error: "session cache miss, degraded to source lookup" },
      { spanId: "sp-au3", parentSpanId: "sp-au2", name: "lookup session", service: "redis-cache", operation: "cache.get", startedAt: at(13, 20, 15), durationMs: 642, status: "error", error: "MISS" },
      { spanId: "sp-au4", parentSpanId: "sp-au2", name: "read session row", service: "postgres-primary", operation: "sql.select", startedAt: at(13, 20, 15), durationMs: 231, status: "ok" },
    ],
  },
  {
    traceId: "t-6b8e0f",
    incidentId: "INC-2390",
    serviceId: "auth-api",
    name: "POST /session/validate",
    operation: "/session/validate",
    startedAt: at(13, 40, 30),
    durationMs: 104,
    status: "ok",
    spans: [
      { spanId: "sp-av1", name: "serve /session/validate", service: "api-gateway", operation: "http", startedAt: at(13, 40, 30), durationMs: 104, status: "ok" },
      { spanId: "sp-av2", parentSpanId: "sp-av1", name: "validate session", service: "auth-api", operation: "session.validate", startedAt: at(13, 40, 30), durationMs: 88, status: "ok" },
      { spanId: "sp-av3", parentSpanId: "sp-av2", name: "lookup session", service: "redis-cache", operation: "cache.get", startedAt: at(13, 40, 30), durationMs: 11, status: "ok" },
    ],
  },
  // INC-2389 — catalog-api degraded search during index rebuild
  {
    traceId: "t-2f5b9d",
    incidentId: "INC-2389",
    serviceId: "catalog-api",
    name: "GET /catalog/search",
    operation: "/catalog/search",
    startedAt: at(14, 12, 8),
    durationMs: 1187,
    status: "error",
    spans: [
      { spanId: "sp-ca1", name: "serve /catalog/search", service: "api-gateway", operation: "http", startedAt: at(14, 12, 8), durationMs: 1187, status: "ok" },
      { spanId: "sp-ca2", parentSpanId: "sp-ca1", name: "search catalog", service: "catalog-api", operation: "catalog.search", startedAt: at(14, 12, 8), durationMs: 1104, status: "error", error: "partial results: index segment not yet searchable" },
      { spanId: "sp-ca3", parentSpanId: "sp-ca2", name: "query index", service: "search-indexer", operation: "index.query", startedAt: at(14, 12, 8), durationMs: 1055, status: "error", error: "rebuilding in progress" },
    ],
  },
  // INC-2388 — search-indexer consumer lag on kafka-bus
  {
    traceId: "t-7c3e2a",
    incidentId: "INC-2388",
    serviceId: "search-indexer",
    name: "consume catalog.events",
    operation: "kafka.consume",
    startedAt: at(9, 50, 4),
    durationMs: 742,
    status: "error",
    spans: [
      { spanId: "sp-si1", name: "poll batch", service: "kafka-bus", operation: "kafka.poll", startedAt: at(9, 50, 4), durationMs: 742, status: "error", error: "rebalance in progress" },
      { spanId: "sp-si2", parentSpanId: "sp-si1", name: "index products", service: "search-indexer", operation: "index.apply", startedAt: at(9, 50, 4), durationMs: 318, status: "error", error: "assignment revoked" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Hypotheses (mock AI analysis for INC-2391)                          */
/* ------------------------------------------------------------------ */
const hypotheses = [
  {
    incidentId: "INC-2391",
    investigation: {
      id: "inv-2391",
      incidentId: "INC-2391",
      generatedAt: at(14, 11, 12),
      hypotheses: [
        {
          id: "h-deploy-281",
          title: "Recent deployment to payment-api (v2.8.1)",
          confidence: 0.82,
          summary:
            "The strongest temporal correlation. Error rate increased 4 minutes after v2.8.1 was released, /checkout became the most affected endpoint, and no dependency showed saturation.",
          status: "candidate",
          evidence: [
            {
              id: "ev-1",
              kind: "fact",
              label: "Deployment v2.8.1 at 14:02",
              detail: "payment-api v2.8.1 released 4 minutes before the first error signal.",
              source: "dep-pay-281",
              sourceType: "deployment",
              impact: "supporting",
              time: at(14, 2),
            },
            {
              id: "ev-2",
              kind: "fact",
              label: "Error rate +38%",
              detail: "HTTP 500 rate increased 38% after deployment; /checkout most affected.",
              source: "payment-api/metrics/error_rate",
              sourceType: "metrics",
              impact: "supporting",
              time: at(14, 6),
            },
            {
              id: "ev-3",
              kind: "inference",
              label: "Temporal correlation tight (+4m)",
              detail: "Error onset followed the deployment window by ~4 minutes.",
              source: "incident/timeline",
              sourceType: "incident",
              impact: "supporting",
            },
            {
              id: "ev-4",
              kind: "fact",
              label: "Database latency stable",
              detail: "PostgreSQL p95 stayed at ~190ms during the window.",
              source: "postgres-primary/metrics/latency_ms",
              sourceType: "dependency",
              impact: "supporting",
              time: at(14, 6, 10),
            },
            {
              id: "ev-5",
              kind: "fact",
              label: "Redis healthy",
              detail: "Cache hit rate 99.1% and latency ~12ms.",
              source: "redis-cache/metrics",
              sourceType: "dependency",
              impact: "supporting",
              time: at(14, 6, 10),
            },
            {
              id: "ev-6",
              kind: "fact",
              label: "CPU / memory normal",
              detail: "payment-api CPU ~66%, memory ~61%; no saturation.",
              source: "payment-api/metrics/cpu_usage",
              sourceType: "infrastructure",
              impact: "supporting",
              time: at(14, 8),
            },
            {
              id: "ev-7",
              kind: "fact",
              label: "Connection resets in authorize step",
              detail: "authorize failed with 'connection reset' against postgres-primary.",
              source: "logs/payment-api",
              sourceType: "logs",
              impact: "supporting",
              time: at(14, 6, 18),
            },
          ],
          counterEvidence: [
            {
              id: "cev-1",
              kind: "inference",
              label: "No code diff observed on authorize path",
              detail: "v2.8.1 touched checkout retry backoff; not the authorize code directly.",
              source: "deployment diff v2.8.0..v2.8.1",
              sourceType: "deployment",
              impact: "counter",
            },
          ],
        },
        {
          id: "h-redis",
          title: "Redis connection degradation",
          confidence: 0.21,
          summary:
            "Alternative hypothesis: connection pool warnings appeared before the error spike, but Redis itself reported healthy cache hit rates.",
          status: "candidate",
          evidence: [
            {
              id: "ev-8",
              kind: "fact",
              label: "Pool warnings at 14:05",
              detail: "Checkout-sessions pool at 78% usage.",
              source: "logs/payment-api",
              sourceType: "logs",
              impact: "supporting",
              time: at(14, 5, 41),
            },
          ],
          counterEvidence: [
            {
              id: "cev-2",
              kind: "fact",
              label: "Redis latency healthy",
              detail: "~12ms p50, 99.1% hit rate during the window.",
              source: "redis-cache/metrics",
              sourceType: "dependency",
              impact: "counter",
              time: at(14, 6, 10),
            },
          ],
        },
      ],
    },
  },
  {
    incidentId: "INC-2390",
    investigation: {
      id: "inv-2390",
      incidentId: "INC-2390",
      generatedAt: at(13, 28, 40),
      hypotheses: [
        {
          id: "h-redis-miss",
          title: "Redis session cache miss storm on auth-api",
          confidence: 0.74,
          summary:
            "Session validation fell back to source lookups after the session cache hit rate collapsed, multiplying p95. Cache warming at 13:40 restored latency to baseline, which confirms the cache path as the cause.",
          status: "candidate",
          evidence: [
            {
              id: "ev-90-1",
              kind: "fact",
              label: "Cache miss logged at 13:20",
              detail: "session validation reported cache miss and took 640ms.",
              source: "logs/auth-api",
              sourceType: "logs",
              impact: "supporting",
              time: at(13, 20, 15),
            },
            {
              id: "ev-90-2",
              kind: "fact",
              label: "Trace shows 642ms stuck in cache.get",
              detail: "sp-au3 lookup session on redis-cache accounts for 70% of the total span.",
              source: "t-4a1d7c",
              sourceType: "trace",
              impact: "supporting",
              time: at(13, 20, 15),
            },
            {
              id: "ev-90-3",
              kind: "fact",
              label: "Postgres source lookup healthy",
              detail: "read session row returned in 231ms, ruling out the database as the bottleneck.",
              source: "t-4a1d7c",
              sourceType: "dependency",
              impact: "supporting",
              time: at(13, 20, 15),
            },
            {
              id: "ev-90-4",
              kind: "fact",
              label: "Warming the cache resolved it",
              detail: "After m.silva warmed session-cache at 13:40, p95 dropped to ~96ms.",
              source: "logs/auth-api",
              sourceType: "logs",
              impact: "supporting",
              time: at(13, 40, 12),
            },
            {
              id: "ev-90-5",
              kind: "inference",
              label: "No deploy in the window",
              detail: "No auth-api deployment between 13:00 and 14:35, so no code change triggered this.",
              source: "deployments/auth-api",
              sourceType: "deployment",
              impact: "counter",
            },
          ],
          counterEvidence: [
            {
              id: "cev-90-1",
              kind: "inference",
              label: "Redis server itself stayed fast",
              detail: "redis-cache p50 latency held at ~12ms with healthy CPU; the miss rate, not Redis speed, is the problem.",
              source: "redis-cache/metrics/latency_ms",
              sourceType: "dependency",
              impact: "counter",
              time: at(13, 30),
            },
          ],
        },
        {
          id: "h-auth-traffic",
          title: "Traffic spike on the auth path",
          confidence: 0.18,
          summary:
            "Alternative hypothesis: a burst of logins could stretch the connection pool. Log volume and error rate stayed flat, so this is unlikely.",
          status: "candidate",
          evidence: [
            {
              id: "ev-90-6",
              kind: "fact",
              label: "Concurrent validations elevated",
              detail: "checkout-sessions pool reached 78% consumption during the window.",
              source: "logs/auth-api",
              sourceType: "logs",
              impact: "supporting",
              time: at(13, 25, 2),
            },
          ],
          counterEvidence: [
            {
              id: "cev-90-2",
              kind: "fact",
              label: "Error rate stayed low",
              detail: "auth-api error rate peaked at ~1.3%, well within tolerance for a capacity problem.",
              source: "auth-api/metrics/error_rate",
              sourceType: "metrics",
              impact: "counter",
              time: at(13, 30),
            },
          ],
        },
      ],
    },
  },
  {
    incidentId: "INC-2389",
    investigation: {
      id: "inv-2389",
      incidentId: "INC-2389",
      generatedAt: at(12, 34, 10),
      hypotheses: [
        {
          id: "h-index-rebuild",
          title: "Full index rebuild degraded catalog search",
          confidence: 0.69,
          summary:
            "The rebuild started at 12:30 makes freshly indexed segments unsearchable, so queries return partial results. The degradation predates the rebuild, which points at the earlier index refresh as the trigger rather than the rebuild itself.",
          status: "candidate",
          evidence: [
            {
              id: "ev-89-1",
              kind: "fact",
              label: "Search p95 degraded at 12:05",
              detail: "Catalog search p95 exceeded 800ms, before the rebuild was triggered.",
              source: "logs/catalog-api",
              sourceType: "logs",
              impact: "supporting",
              time: at(12, 5, 20),
            },
            {
              id: "ev-89-2",
              kind: "fact",
              label: "Trace shows unsearchable segment",
              detail: "index.query returned 'rebuilding in progress' for the search-indexer span.",
              source: "t-2f5b9d",
              sourceType: "trace",
              impact: "supporting",
              time: at(14, 12, 8),
            },
            {
              id: "ev-89-3",
              kind: "fact",
              label: "Index rebuild in progress",
              detail: "A. Kumar triggered a full index rebuild at 12:30.",
              source: "incident/timeline",
              sourceType: "incident",
              impact: "supporting",
              time: at(12, 30),
            },
            {
              id: "ev-89-4",
              kind: "fact",
              label: "Still degraded in the current window",
              detail: "catalog-api p95 holds around 640ms and error rate near 1.9%.",
              source: "catalog-api/metrics/latency_ms",
              sourceType: "metrics",
              impact: "supporting",
              time: at(14, 20),
            },
          ],
          counterEvidence: [
            {
              id: "cev-89-1",
              kind: "inference",
              label: "Onset predates the rebuild",
              detail: "Latency was already above 800ms at 12:05, 25 minutes before the rebuild started, so the rebuild is not the sole cause.",
              source: "incident/timeline",
              sourceType: "incident",
              impact: "counter",
            },
          ],
        },
        {
          id: "h-indexer-lag",
          title: "search-indexer backlog starving the query path",
          confidence: 0.27,
          summary:
            "Alternative hypothesis: the indexer still lags behind kafka-bus, so segments are missing at query time. This is a real contributing factor and overlaps with INC-2388.",
          status: "candidate",
          evidence: [
            {
              id: "ev-89-5",
              kind: "fact",
              label: "Indexer lag reported earlier",
              detail: "Consumer lag on search-indexer was already a known problem resolved in INC-2388.",
              source: "logs/search-indexer",
              sourceType: "logs",
              impact: "supporting",
              time: at(9, 30),            },
          ],
          counterEvidence: [
            {
              id: "cev-89-2",
              kind: "fact",
              label: "Indexer lag is at zero",
              detail: "INC-2388 resolved the consumer group imbalance; lag returned to 0 at 10:12.",
              source: "incident/timeline",
              sourceType: "incident",
              impact: "counter",
              time: at(10, 12),
            },
          ],
        },
      ],
    },
  },
  {
    incidentId: "INC-2388",
    investigation: {
      id: "inv-2388",
      incidentId: "INC-2388",
      generatedAt: at(9, 58, 30),
      hypotheses: [
        {
          id: "h-consumer-imbalance",
          title: "Consumer group imbalance on search-indexer",
          confidence: 0.88,
          summary:
            "Partitions were unevenly assigned across indexer replicas, so a subset of partitions went unconsumed and the index went stale. Rebalancing at 09:55 restored full coverage.",
          status: "accepted",
          evidence: [
            {
              id: "ev-88-1",
              kind: "fact",
              label: "Lag growing from 09:30",
              detail: "Consumer lag on partition 4 climbed steadily from 12000 messages.",
              source: "logs/search-indexer",
              sourceType: "logs",
              impact: "supporting",
              time: at(9, 30),
            },
            {
              id: "ev-88-2",
              kind: "fact",
              label: "Revoked assignment in trace",
              detail: "poll batch failed with 'rebalance in progress'; index.apply saw 'assignment revoked'.",
              source: "t-7c3e2a",
              sourceType: "trace",
              impact: "supporting",
              time: at(9, 50, 4),
            },
            {
              id: "ev-88-3",
              kind: "fact",
              label: "Rebalance fixed it",
              detail: "Partitions were rebalanced at 09:55 and lag returned to 0 by 10:12.",
              source: "logs/search-indexer",
              sourceType: "logs",
              impact: "supporting",
              time: at(9, 55),
            },
            {
              id: "ev-88-4",
              kind: "inference",
              label: "kafka-bus itself healthy",
              detail: "Broker throughput and latency were normal, isolating the fault to the consumer side.",
              source: "kafka-bus/metrics",
              sourceType: "dependency",
              impact: "counter",
            },
          ],
          counterEvidence: [],
        },
        {
          id: "h-indexer-capacity",
          title: "Indexer replica CPU saturation",
          confidence: 0.12,
          summary:
            "Alternative hypothesis: replicas were CPU-bound and could not keep up. Resource usage stayed well below saturation.",
          status: "dismissed",
          evidence: [
            {
              id: "ev-88-5",
              kind: "inference",
              label: "Backlog implies slow consumption",
              detail: "A growing lag is consistent with under-provisioned consumers.",
              source: "incident/timeline",
              sourceType: "incident",
              impact: "supporting",
              time: at(9, 40),
            },
          ],
          counterEvidence: [
            {
              id: "cev-88-1",
              kind: "fact",
              label: "CPU far from saturation",
              detail: "search-indexer CPU never exceeded ~28% during the incident window.",
              source: "search-indexer/metrics/cpu_usage",
              sourceType: "infrastructure",
              impact: "counter",
              time: at(9, 50),
            },
          ],
        },
      ],
    },
  },
];

/* ------------------------------------------------------------------ */
/* Validation — fail fast if output drifts from the frontend schema    */
/* ------------------------------------------------------------------ */
function assert(condition, message) {
  if (!condition) throw new Error(`generate-mock validation failed: ${message}`);
}

function validate() {
  const serviceIds = new Set(services.map((s) => s.id));

  assert(Array.isArray(services) && services.length > 0, "services must be a non-empty array");
  for (const s of services) {
    assert(typeof s.id === "string" && typeof s.name === "string" && typeof s.kind === "string", `service ${s.id ?? "?"} missing id/name/kind`);
    assert(Array.isArray(s.dependencies), `service ${s.id} dependencies must be an array`);
    for (const dep of s.dependencies) assert(serviceIds.has(dep), `service ${s.id} depends on unknown service ${dep}`);
  }

  assert(Array.isArray(incidents) && incidents.length > 0, "incidents must be a non-empty array");
  for (const inc of incidents) {
    assert(inc.id?.startsWith("INC-"), `incident id must start with INC-: ${inc.id}`);
    assert(serviceIds.has(inc.serviceId), `incident ${inc.id} references unknown service ${inc.serviceId}`);
    assert(["P1", "P2", "P3", "P4"].includes(inc.severity), `incident ${inc.id} invalid severity ${inc.severity}`);
    assert(["DETECTED", "INVESTIGATING", "MITIGATING", "MONITORING", "RESOLVED"].includes(inc.status), `incident ${inc.id} invalid status ${inc.status}`);
    assert(Array.isArray(inc.timeline) && inc.timeline.length > 0, `incident ${inc.id} timeline must be non-empty`);
    assert(Array.isArray(inc.affectedServices), `incident ${inc.id} affectedServices must be an array`);
  }

  assert(Array.isArray(metrics) && metrics.length > 0, "metrics must be a non-empty array");
  const metricKeys = new Set();
  const METRIC_NAMES = ["latency_ms", "error_rate", "request_rate", "cpu_usage", "memory_usage"];
  for (const m of metrics) {
    assert(serviceIds.has(m.serviceId), `metric series references unknown service ${m.serviceId}`);
    assert(METRIC_NAMES.includes(m.metric), `metric ${m.serviceId}/${m.metric} has unknown metric name`);
    const key = `${m.serviceId}/${m.metric}`;
    assert(!metricKeys.has(key), `duplicate metric series ${key}`);
    metricKeys.add(key);
    assert(Array.isArray(m.points) && m.points.length > 0, `metric ${m.serviceId}/${m.metric} has no points`);
    assert(m.points.every((p) => typeof p.timestamp === "string" && typeof p.value === "number"), `metric ${m.serviceId}/${m.metric} has invalid points`);
  }
  // Every service must expose at least one series, otherwise its detail page
  // renders an empty chart.
  for (const id of serviceIds) {
    assert(
      metrics.some((m) => m.serviceId === id),
      `service ${id} has no metric series`,
    );
  }

  assert(Array.isArray(deployments), "deployments must be an array");
  const deploymentIds = new Set();
  for (const d of deployments) {
    assert(serviceIds.has(d.serviceId), `deployment ${d.id} references unknown service ${d.serviceId}`);
    assert(!deploymentIds.has(d.id), `duplicate deployment id ${d.id}`);
    deploymentIds.add(d.id);
  }

  assert(Array.isArray(traces), "traces must be an array");
  const traceIds = new Set();
  for (const t of traces) {
    assert(serviceIds.has(t.serviceId), `trace ${t.traceId} references unknown service ${t.serviceId}`);
    assert(!traceIds.has(t.traceId), `duplicate trace id ${t.traceId}`);
    traceIds.add(t.traceId);
    assert(Array.isArray(t.spans) && t.spans.length > 0, `trace ${t.traceId} has no spans`);
    const spanIds = new Set();
    for (const s of t.spans) {
      assert(!spanIds.has(s.spanId), `duplicate span id ${s.spanId} in trace ${t.traceId}`);
      spanIds.add(s.spanId);
      assert(serviceIds.has(s.service), `span ${s.spanId} references unknown service ${s.service}`);
    }
  }

  const hypothesisIds = new Set();
  const EVIDENCE_KINDS = ["fact", "inference"];
  const EVIDENCE_IMPACTS = ["supporting", "counter"];
  const EVIDENCE_SOURCE_TYPES = [
    "metrics", "logs", "deployment", "trace", "dependency", "infrastructure", "incident",
  ];
  const HYPOTHESIS_STATUSES = ["candidate", "accepted", "dismissed"];
  assert(Array.isArray(hypotheses), "hypotheses must be an array");
  const investigationIds = new Set();
  for (const h of hypotheses) {
    const inv = h.investigation;
    assert(inv?.incidentId === h.incidentId, `investigation ${inv?.id} incidentId mismatch`);
    assert(!investigationIds.has(inv.id), `duplicate investigation id ${inv.id}`);
    investigationIds.add(inv.id);
    assert(Array.isArray(inv.hypotheses) && inv.hypotheses.length > 0, `investigation ${inv.id} has no hypotheses`);
    for (const hp of inv.hypotheses) {
      assert(!hypothesisIds.has(hp.id), `duplicate hypothesis id ${hp.id}`);
      hypothesisIds.add(hp.id);
      assert(hp.confidence >= 0 && hp.confidence <= 1, `hypothesis ${hp.id} confidence out of range`);
      assert(HYPOTHESIS_STATUSES.includes(hp.status), `hypothesis ${hp.id} invalid status ${hp.status}`);
      assert(Array.isArray(hp.evidence) && Array.isArray(hp.counterEvidence), `hypothesis ${hp.id} evidence arrays missing`);
      assert(hp.evidence.length > 0, `hypothesis ${hp.id} has no supporting evidence`);
      const evidenceIds = new Set();
      for (const ev of [...hp.evidence, ...hp.counterEvidence]) {
        assert(!evidenceIds.has(ev.id), `duplicate evidence id ${ev.id}`);
        evidenceIds.add(ev.id);
        assert(EVIDENCE_KINDS.includes(ev.kind), `evidence ${ev.id} invalid kind ${ev.kind}`);
        assert(EVIDENCE_IMPACTS.includes(ev.impact), `evidence ${ev.id} invalid impact ${ev.impact}`);
        assert(
          EVIDENCE_SOURCE_TYPES.includes(ev.sourceType),
          `evidence ${ev.id} invalid sourceType ${ev.sourceType}`,
        );
        if (ev.time) assert(!Number.isNaN(Date.parse(ev.time)), `evidence ${ev.id} has invalid time ${ev.time}`);
      }
    }
  }

  // Every incident must be analyzable, otherwise the analysis endpoint 404s
  // and the investigation link stays hidden on the incident detail page.
  for (const inc of incidents) {
    assert(
      hypotheses.some((h) => h.incidentId === inc.id),
      `incident ${inc.id} has no investigation, so its analysis endpoint would 404`,
    );
    // ...and must actually have telemetry to investigate.
    assert(logs.some((l) => l.incidentId === inc.id), `incident ${inc.id} has no logs`);
    assert(traces.some((t) => t.incidentId === inc.id), `incident ${inc.id} has no traces`);
  }

  console.log("validation passed.");
}

/* ------------------------------------------------------------------ */
/* Write                                                               */
/* ------------------------------------------------------------------ */
mkdirSync(OUT_DIR, { recursive: true });

const files = {
  "services.json": services,
  "incidents.json": incidents,
  "metrics.json": metrics,
  "logs.json": logs.map((_, i) => logEntry(i)),
  "deployments.json": deployments,
  "traces.json": traces,
  "hypotheses.json": hypotheses,
};

validate();

// `--check` regenerates in memory and only reports drift, so CI can assert the
// committed datasets still match the generator without touching the working
// tree. Without it the files are written.
const check = process.argv.includes("--check");

const drifted = [];
for (const [name, data] of Object.entries(files)) {
  const file = join(OUT_DIR, name);
  const serialized = JSON.stringify(data, null, 2) + "\n";
  if (check) {
    const current = existsSync(file) ? readFileSync(file, "utf8") : null;
    if (current !== serialized) drifted.push(name);
    continue;
  }
  writeFileSync(file, serialized);
  console.log(`wrote ${file} (${Buffer.byteLength(serialized, "utf8")} bytes)`);
}

if (check) {
  if (drifted.length > 0) {
    console.error(
      `mock data out of date, run \`npm run generate:mock\`: ${drifted.join(", ")}`,
    );
    process.exit(1);
  }
  console.log("mock data matches the generator.");
} else {
  console.log("mock data generated.");
}