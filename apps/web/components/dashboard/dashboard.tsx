"use client";

import Link from "next/link";

import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Crosshair,
  Gauge,
  Percent,
  Server,
  Zap,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@rootline/ui";

import { useIncidents } from "@/features/incidents/use-incidents";
import { useDeployments } from "@/features/deployments/use-deployments";
import { useServices, useSystemHealth } from "@/features/services/use-services";
import { formatPercent, formatTime, HEALTH_META } from "@/lib/format";
import { HealthDot, SeverityBadge, StatusBadge } from "@/components/common/badges";
import { LoadingBlock } from "@/components/common/states";

const KIND_LABEL: Record<string, string> = {
  frontend: "Frontend",
  gateway: "Gateway",
  api: "API",
  worker: "Worker",
  data: "Database",
  cache: "Cache",
  message_bus: "Message bus",
};

export function Dashboard() {
  const health = useSystemHealth();
  const incidents = useIncidents();
  const services = useServices();
  const deployments = useDeployments();

  const loading = health.isLoading || incidents.isLoading || services.isLoading;

  const activeIncidents = (incidents.data ?? [])
    .filter((i) => i.status !== "RESOLVED")
    .sort((a, b) => a.severity.localeCompare(b.severity));

  const serviceRows = (services.data ?? []).slice().sort((a, b) => {
    const rank: Record<string, number> = { critical: 0, degraded: 1, healthy: 2, unknown: 3 };
    return (rank[a.health] ?? 9) - (rank[b.health] ?? 9);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Current state of your systems, incidents and recent changes.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/incidents">
            Incident Center <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          <HealthOverview
            availability={health.data?.availability ?? 0}
            avgLatencyMs={health.data?.avgLatencyMs ?? 0}
            errorRate={health.data?.errorRate ?? 0}
            serviceCount={health.data?.serviceCount ?? 0}
            activeIncidents={health.data?.activeIncidents ?? 0}
          />

          <div className="grid gap-6 lg:grid-cols-5">
            <ActiveIncidentsPanel
              incidents={activeIncidents}
              services={services.data ?? []}
              className="lg:col-span-2"
            />
            <ServiceHealthTable
              services={serviceRows}
              className="lg:col-span-3"
            />
          </div>

          <RecentDeployments deployments={deployments.data ?? []} services={services.data ?? []} />
        </>
      )}
    </div>
  );
}

function HealthOverview({
  availability,
  avgLatencyMs,
  errorRate,
  serviceCount,
  activeIncidents,
}: {
  availability: number;
  avgLatencyMs: number;
  errorRate: number;
  serviceCount: number;
  activeIncidents: number;
}) {
  const stats = [
    { label: "Availability", value: formatPercent(availability), icon: CheckCircle2, tone: "text-success" },
    { label: "Avg latency", value: `${avgLatencyMs}ms`, icon: Gauge, tone: avgLatencyMs > 200 ? "text-warning" : "text-info" },
    { label: "Error rate", value: formatPercent(errorRate, 2), icon: Percent, tone: errorRate > 1 ? "text-critical" : "text-info" },
    { label: "Services", value: String(serviceCount), icon: Server, tone: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {stats.map((s) => (
        <Card key={s.label} className="gap-1 py-4 lg:col-span-1">
          <CardContent className="flex items-center gap-3 px-4">
            <span className={cn("rounded-md border border-border/70 bg-card p-2", s.tone)}>
              <s.icon className="size-4" />
            </span>
            <div>
              <p className="text-muted-foreground text-xs">{s.label}</p>
              <p className="font-mono text-2xl font-medium tracking-tight">{s.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className={cn("gap-0 py-0 lg:col-span-1", activeIncidents > 0 && "border-critical/30")}>
        <CardHeader className="flex flex-row items-center justify-between gap-2 py-4">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Active incidents
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3 px-4 pb-4">
          <span className={cn("flex size-9 items-center justify-center rounded-md border border-border/70", activeIncidents > 0 ? "bg-critical/10 text-critical" : "bg-success/10 text-success")}>
            <Zap className="size-4" />
          </span>
          <div>
            <p className={cn("font-mono text-2xl font-medium", activeIncidents > 0 ? "text-critical" : "text-success")}>
              {activeIncidents}
            </p>
            <p className="text-muted-foreground text-xs">
              {activeIncidents > 0 ? "needs attention" : "all clear"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActiveIncidentsPanel({
  incidents,
  services,
  className,
}: {
  incidents: NonNullable<ReturnType<typeof useIncidents>["data"]>;
  services: ReturnType<typeof useServices>["data"];
  className?: string;
}) {
  const name = (serviceId: string) =>
    (services ?? []).find((s) => s.id === serviceId)?.name ?? serviceId;

  return (
    <Card className={cn("gap-0", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Zap className="text-critical size-4" />
          Active incidents
        </CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/incidents">
              View all <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {incidents.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-success/20 bg-success/5 p-4 text-sm text-success">
            <CheckCircle2 className="size-4" /> No active incidents.
          </div>
        ) : (
          incidents.map((incident) => (
            <Link
              key={incident.id}
              href={`/incidents/${incident.id}`}
              className="hover:bg-accent/60 group flex items-center gap-3 rounded-md border border-border/60 p-3 transition-colors"
            >
              <SeverityBadge severity={incident.severity} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium group-hover:underline">
                  {incident.title}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {name(incident.serviceId)} · started {formatTime(incident.startedAt)}
                </p>
              </div>
              <StatusBadge status={incident.status} />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ServiceHealthTable({
  services,
  className,
}: {
  services: NonNullable<ReturnType<typeof useServices>["data"]>;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CircleGauge className="size-4" />
          Service health
        </CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/services">
              Service map <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Health</TableHead>
              <TableHead className="text-right">Latency</TableHead>
              <TableHead className="text-right">Errors</TableHead>
              <TableHead className="text-right">Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => {
              const health = HEALTH_META[service.health];
              const critical = service.health === "critical";
              const degraded = service.health === "degraded";
              return (
                <TableRow
                  key={service.id}
                  className={cn(critical && "bg-critical/[0.04]", degraded && "bg-warning/[0.03]")}
                >
                  <TableCell>
                    <Link href={`/services/${service.id}`} className="flex items-center gap-2.5">
                      <HealthDot health={service.health} />
                      <span className="font-medium">{service.name}</span>
                      <span className="text-muted-foreground hidden font-mono text-[11px] sm:inline">
                        {KIND_LABEL[service.kind] ?? service.kind}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={health.badge} className="font-mono text-[10px]">
                      {health.label}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn("text-right font-mono", degraded || critical ? "text-warning" : "text-muted-foreground")}>
                    {service.latencyMs}ms
                  </TableCell>
                  <TableCell className={cn("text-right font-mono", critical ? "text-critical" : degraded ? "text-warning" : "text-muted-foreground")}>
                    {formatPercent(service.errorRate, 2)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right font-mono">
                    {service.version}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RecentDeployments({
  deployments,
  services,
}: {
  deployments: NonNullable<ReturnType<typeof useDeployments>["data"]>;
  services: NonNullable<ReturnType<typeof useServices>["data"]>;
}) {
  const recent = deployments.slice().sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 3);
  const name = (serviceId: string) =>
    (services ?? []).find((s) => s.id === serviceId)?.name ?? serviceId;

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Crosshair className="size-4" />
          Recent deployments
        </CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/deployments">
              Deployment timeline <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {recent.map((dep) => (
          <div key={dep.id} className="flex items-center gap-3 rounded-md border border-border/60 p-3">
            <span className="bg-info/10 text-info flex size-9 shrink-0 items-center justify-center rounded-md border border-info/20">
              <Crosshair className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-medium">{dep.version}</p>
              <p className="text-muted-foreground truncate text-xs">
                {name(dep.serviceId)}
              </p>
              <p className="text-muted-foreground font-mono text-[11px]">
                {formatTime(dep.startedAt)} · {dep.author}
              </p>
            </div>
          </div>
        ))}
        {recent.length === 0 ? (
          <p className="text-muted-foreground text-sm">No deployments yet.</p>
        ) : null}
      </CardContent>
      <CardDescription className="sr-only">
        Latest deployments across services.
      </CardDescription>
    </Card>
  );
}