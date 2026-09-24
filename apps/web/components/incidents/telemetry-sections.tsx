"use client";

import * as React from "react";

import { Database, Radio, ScrollText, Waypoints } from "lucide-react";

import type { Incident, LogLevel, MetricName, Trace } from "@rootline/types";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@rootline/ui";

import { useIncidentLogs, useIncidentTraces } from "@/features/telemetry/use-telemetry";
import { useServiceMetrics } from "@/features/services/use-services";
import { useDeployments } from "@/features/deployments/use-deployments";
import { formatDurationMs, formatTime } from "@/lib/format";
import { MetricChart } from "@/components/charts/metric-chart";
import { EmptyState, LoadingBlock } from "@/components/common/states";

const METRIC_DEFS: { key: MetricName; label: string; unit: string; color: string; tone: string }[] = [
  { key: "latency_ms", label: "Latency", unit: "ms", color: "#3d7eff", tone: "text-info" },
  { key: "error_rate", label: "Error rate", unit: "%", color: "#ef4444", tone: "text-critical" },
  { key: "request_rate", label: "Request rate", unit: "req/s", color: "#3d7eff", tone: "text-info" },
  { key: "cpu_usage", label: "CPU", unit: "%", color: "#f59e0b", tone: "text-warning" },
  { key: "memory_usage", label: "Memory", unit: "%", color: "#8b8b93", tone: "text-muted-foreground" },
];

const LOG_LEVEL_META: Record<LogLevel, { badge: "critical" | "warning" | "info" | "muted" }> = {
  error: { badge: "critical" },
  warn: { badge: "warning" },
  info: { badge: "info" },
  debug: { badge: "muted" },
};

export function TelemetrySections({ incident }: { incident: Incident }) {
  return (
    <Card className="gap-0">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-sm">Telemetry &amp; context</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs defaultValue="metrics">
          <TabsList>
            <TabsTrigger value="metrics"><Radio className="size-3.5" /> Metrics</TabsTrigger>
            <TabsTrigger value="logs"><ScrollText className="size-3.5" /> Logs</TabsTrigger>
            <TabsTrigger value="traces"><Waypoints className="size-3.5" /> Traces</TabsTrigger>
            <TabsTrigger value="deployments"><Database className="size-3.5" /> Deployments</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="mt-4">
            <MetricsPanel serviceId={incident.serviceId} />
          </TabsContent>
          <TabsContent value="logs" className="mt-4">
            <LogsPanel incident={incident} />
          </TabsContent>
          <TabsContent value="traces" className="mt-4">
            <TracesPanel incidentId={incident.id} />
          </TabsContent>
          <TabsContent value="deployments" className="mt-4">
            <DeploymentsPanel serviceId={incident.serviceId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function MetricsPanel({ serviceId }: { serviceId: string }) {
  const [metric, setMetric] = React.useState<MetricName>("latency_ms");
  const metrics = useServiceMetrics(serviceId);
  const def = METRIC_DEFS.find((m) => m.key === metric)!;
  const series = metrics.data?.find((s) => s.metric === metric);

  if (metrics.isLoading) return <LoadingBlock />;
  if (!series) return <EmptyState title="No metrics for this service" />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {METRIC_DEFS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs transition-colors",
              metric === m.key
                ? "border-foreground/40 bg-accent text-foreground"
                : "border-border/70 text-muted-foreground hover:bg-accent/50",
            )}
          >
            {m.label}
          </button>
        ))}
        <span className={cn("font-mono text-xs", def.tone)}>
          {def.label} · {def.unit}
        </span>
      </div>
      <MetricChart series={series} fill={def.color} height={220} showGrid />
    </div>
  );
}

function LogsPanel({ incident }: { incident: Incident }) {
  const logs = useIncidentLogs(incident.id);

  if (logs.isLoading) return <LoadingBlock />;
  const entries = logs.data ?? [];
  if (entries.length === 0) return <EmptyState title="No logs found" />;

  return (
    <div className="space-y-1.5">
      {entries.map((log) => {
        const meta = LOG_LEVEL_META[log.level];
        const fields = Object.entries(log.fields);
        return (
          <div key={log.id} className="hover:bg-accent/40 rounded-md border border-border/50 px-3 py-2 transition-colors">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">{formatTime(log.timestamp)}</span>
              <Badge variant={meta.badge} className="font-mono text-[10px]">{log.level}</Badge>
              <span className="text-mono text-xs">{log.message}</span>
            </div>
            {fields.length > 0 ? (
              <p className="mt-1 pl-14 font-mono text-[11px] text-muted-foreground/80">
                {fields.map(([k, v]) => `${k}=${v}`).join("  ")}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function TracesPanel({ incidentId }: { incidentId: string }) {
  const traces = useIncidentTraces(incidentId);

  if (traces.isLoading) return <LoadingBlock />;
  const list = traces.data ?? [];
  if (list.length === 0) return <EmptyState title="No traces for this incident" />;

  return (
    <div className="space-y-3">
      {list.map((trace) => (
        <TraceRow key={trace.traceId} trace={trace} />
      ))}
    </div>
  );
}

function TraceRow({ trace }: { trace: Trace }) {
  const roots = trace.spans.filter((s) => !s.parentSpanId);
  return (
    <div className="rounded-md border border-border/60 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs">{trace.traceId}</span>
        <Badge variant={trace.status === "error" ? "critical" : "success"} className="font-mono text-[10px]">
          {trace.status}
        </Badge>
        <span className="text-sm font-medium">{trace.name}</span>
        <span className="text-muted-foreground font-mono text-xs text-right ml-auto">
          {trace.operation} · {formatDurationMs(trace.durationMs)} · {formatTime(trace.startedAt)}
        </span>
      </div>
      <div className="mt-2 space-y-1">
        {roots.map((span) => (
          <SpanChildren key={span.spanId} trace={trace} spanId={span.spanId} depth={0} />
        ))}
      </div>
    </div>
  );
}

function SpanChildren({ trace, spanId, depth }: { trace: Trace; spanId: string; depth: number }) {
  const span = trace.spans.find((s) => s.spanId === spanId);
  if (!span) return null;
  const children = trace.spans.filter((s) => s.parentSpanId === spanId);

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <div className="flex items-center gap-2 border-l border-border/40 py-0.5 pl-2">
        <Badge variant={span.status === "error" ? "critical" : "muted"} className="font-mono text-[10px]">
          {span.status}
        </Badge>
        <span className="text-xs font-medium">{span.name}</span>
        <span className="text-muted-foreground font-mono text-[11px]">{span.service}</span>
        <span className="text-muted-foreground font-mono text-[11px] ml-auto">{formatDurationMs(span.durationMs)}</span>
        {span.error ? (
          <span className="text-critical max-w-md truncate font-mono text-[11px]">{span.error}</span>
        ) : null}
      </div>
      {children.map((child) => (
        <SpanChildren key={child.spanId} trace={trace} spanId={child.spanId} depth={depth + 1} />
      ))}
    </div>
  );
}

function DeploymentsPanel({ serviceId }: { serviceId: string }) {
  const deployments = useDeployments();
  const list = (deployments.data ?? [])
    .filter((d) => d.serviceId === serviceId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  if (deployments.isLoading) return <LoadingBlock />;
  if (list.length === 0) return <EmptyState title="No deployments for this service" />;

  return (
    <div className="space-y-1.5">
      {list.map((dep) => (
        <div key={dep.id} className="hover:bg-accent/40 flex flex-wrap items-center gap-3 rounded-md border border-border/50 px-3 py-2.5">
          <span className="text-muted-foreground font-mono text-[11px]">{formatTime(dep.startedAt)}</span>
          <Badge variant={dep.status === "deployed" ? "success" : dep.status === "rolled_back" ? "warning" : "critical"} className="font-mono text-[10px]">
            {dep.status}
          </Badge>
          <span className="font-mono text-sm font-medium">{dep.version}</span>
          <span className="text-sm">{dep.description}</span>
          <span className="text-muted-foreground font-mono text-xs ml-auto">
            {dep.author} · {dep.commit.slice(0, 7)}
          </span>
        </div>
      ))}
    </div>
  );
}