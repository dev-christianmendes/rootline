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
import { mkdirSync, writeFileSync } from "node:fs";
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
/* Time helpers — everything is UTC, same "today"                      */
/* ------------------------------------------------------------------ */
const now = new Date();
const DAY = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
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

// healthy references
for (const [sid, baseLat, baseErr] of [
  ["api-gateway", 84, 0.12],
  ["checkout-api", 268, 1.1],
  ["catalog-api", 96, 0.18],
]) {
  metrics.push(
    series(sid, "latency_ms", "ms", () => baseLat + noise(8)()),
    series(sid, "error_rate", "%", () => baseErr + noise(0.05)()),
  );
}

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
];

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

for (const [name, data] of Object.entries(files)) {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  console.log(`wrote ${file} (${Buffer.byteLength(JSON.stringify(data), "utf8")} bytes)`);
}

console.log("mock data generated.");