"use client";

import * as React from "react";
import Link from "next/link";

import { ArrowRight, Gauge, Percent, Server, Timer } from "lucide-react";

import type { Service } from "@rootline/types";
import { Badge, Card, CardContent, CardHeader, CardTitle, cn } from "@rootline/ui";

import { useService, useServices } from "@/features/services/use-services";
import { useIncidents } from "@/features/incidents/use-incidents";
import { useDeployments } from "@/features/deployments/use-deployments";
import { useServiceMetrics } from "@/features/services/use-services";
import { formatPercent, formatTime, HEALTH_META } from "@/lib/format";
import { HealthDot, SeverityBadge, StatusBadge } from "@/components/common/badges";
import { ErrorState, EmptyState, LoadingBlock, PageHeader, SectionLabel } from "@/components/common/states";
import { MetricChart } from "@/components/charts/metric-chart";

const KIND_LABEL: Record<string, string> = {
  frontend: "Frontend",
  gateway: "Gateway",
  api: "API",
  worker: "Worker",
  data: "Database",
  cache: "Cache",
  message_bus: "Message bus",
};

export function ServiceDetail({ serviceId }: { serviceId: string }) {
  const serviceQ = useService(serviceId);
  const services = useServices();
  const incidents = useIncidents();
  const deployments = useDeployments();

  if (serviceQ.isLoading) return <LoadingBlock />;
  if (serviceQ.isError || !serviceQ.data) {
    return (
      <ErrorState title="Service not found" detail={serviceQ.error?.message} onRetry={() => serviceQ.refetch()} />
    );
  }

  const service = serviceQ.data;
  const all = services.data ?? [];
  const dependencies = service.dependencies
    .map((id) => all.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s));
  const dependents = all.filter((s) => s.dependencies.includes(service.id));

  const serviceIncidents = (incidents.data ?? []).filter(
    (i) =>
      i.serviceId === service.id ||
      i.affectedServices.some((a) => a.serviceId === service.id),
  );
  const serviceDeployments = (deployments.data ?? []).filter(
    (d) => d.serviceId === service.id,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {service.name}
            <Badge variant="secondary" className="font-mono">{KIND_LABEL[service.kind] ?? service.kind}</Badge>
            <Badge variant={HEALTH_META[service.health].badge}>{HEALTH_META[service.health].label}</Badge>
          </span>
        }
        description={`${service.description} · ${service.team}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Timer} label="Latency" value={`${service.latencyMs}ms`} tone={service.latencyMs > 200 ? "text-warning" : "text-info"} />
        <StatCard icon={Gauge} label="p95 latency" value={`${service.p95LatencyMs}ms`} tone={service.p95LatencyMs > 600 ? "text-warning" : "text-info"} />
        <StatCard icon={Percent} label="Error rate" value={formatPercent(service.errorRate, 2)} tone={service.errorRate > 1 ? "text-critical" : "text-info"} />
        <StatCard icon={Server} label="Availability" value={formatPercent(service.availability)} tone={service.availability < 99.9 ? "text-warning" : "text-success"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="gap-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceMetrics serviceId={service.id} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="gap-0">
            <CardHeader>
              <CardTitle className="text-sm">Dependencies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <SectionLabel>Depends on</SectionLabel>
                <div className="mt-2 space-y-1.5">
                  {dependencies.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No outgoing dependencies.</p>
                  ) : (
                    dependencies.map((dep) => (
                      <ServiceRef key={dep.id} service={dep} />
                    ))
                  )}
                </div>
              </div>
              <div>
                <SectionLabel>Depended on by</SectionLabel>
                <div className="mt-2 space-y-1.5">
                  {dependents.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No incoming dependencies.</p>
                  ) : (
                    dependents.map((dep) => (
                      <ServiceRef key={dep.id} service={dep} />
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-0">
          <CardHeader>
            <CardTitle className="text-sm">Recent incidents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {serviceIncidents.length === 0 ? (
              <EmptyState title="No incidents for this service" />
            ) : (
              serviceIncidents.map((incident) => (
                <Link key={incident.id} href={`/incidents/${incident.id}`} className="hover:bg-accent/60 flex items-center gap-3 rounded-md border border-border/60 p-2.5 transition-colors">
                  <SeverityBadge severity={incident.severity} />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs">{incident.id}</p>
                    <p className="truncate text-sm font-medium">{incident.title}</p>
                  </div>
                  <span className="text-muted-foreground font-mono text-[11px]">{formatTime(incident.startedAt)}</span>
                  <StatusBadge status={incident.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader>
            <CardTitle className="text-sm">Deployments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {serviceDeployments.length === 0 ? (
              <EmptyState title="No deployments for this service" />
            ) : (
              serviceDeployments
                .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
                .map((dep) => (
                  <div key={dep.id} className="flex items-center gap-3 rounded-md border border-border/60 p-2.5">
                    <span className="bg-info/10 text-info flex size-8 items-center justify-center rounded-md border border-info/20">
                      <ArrowRight className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-medium">{dep.version}</p>
                      <p className="text-muted-foreground truncate text-xs">{dep.description}</p>
                    </div>
                    <div className="text-right font-mono text-[11px] text-muted-foreground">
                      <p>{formatTime(dep.startedAt)}</p>
                      <p>{dep.author}</p>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <span className={cn("rounded-md border border-border/70 bg-card p-2", tone)}>
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="font-mono text-xl font-medium tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceRef({ service }: { service: Service }) {
  return (
    <Link href={`/services/${service.id}`} className="hover:bg-accent/60 flex items-center gap-2.5 rounded-md border border-border/60 px-3 py-2 transition-colors">
      <HealthDot health={service.health} />
      <span className="text-sm font-medium">{service.name}</span>
      <span className="text-muted-foreground ml-auto font-mono text-[11px]">
        {service.latencyMs}ms · {formatPercent(service.errorRate, 2)}
      </span>
    </Link>
  );
}

function ServiceMetrics({ serviceId }: { serviceId: string }) {
  const [metric, setMetric] = React.useState<"latency_ms" | "error_rate">("latency_ms");
  const metrics = useServiceMetrics(serviceId);
  const series = metrics.data?.find((s) => s.metric === metric);

  const defs = {
    latency_ms: { label: "Latency", unit: "ms", color: "#3d7eff" },
    error_rate: { label: "Error rate", unit: "%", color: "#ef4444" },
  } as const;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(["latency_ms", "error_rate"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs transition-colors",
              metric === m
                ? "border-foreground/40 bg-accent text-foreground"
                : "border-border/70 text-muted-foreground hover:bg-accent/50",
            )}
          >
            {defs[m].label}
          </button>
        ))}
      </div>
      {series ? (
        <MetricChart series={series} fill={defs[metric].color} height={220} showGrid />
      ) : (
        <EmptyState title="No metrics available" />
      )}
    </div>
  );
}