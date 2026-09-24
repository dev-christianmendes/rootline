"use client";

import Link from "next/link";
import { Crosshair, Rocket } from "lucide-react";

import type { Deployment, Incident } from "@rootline/types";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from "@rootline/ui";

import { useDeployments } from "@/features/deployments/use-deployments";
import { useIncidents } from "@/features/incidents/use-incidents";
import { useServices } from "@/features/services/use-services";
import { formatTime, SEVERITY_META } from "@/lib/format";
import { EmptyState, LoadingBlock } from "@/components/common/states";

const RELATED_WINDOW_MS = 15 * 60 * 1000;

function relatedIncident(
  deployment: Deployment,
  incidents: Incident[],
): Incident | null {
  const start = new Date(deployment.startedAt).getTime();
  let best: Incident | null = null;
  let bestDiff = Infinity;
  for (const incident of incidents) {
    const incidentStart = new Date(incident.startedAt).getTime();
    const diff = incidentStart - start;
    if (diff > 0 && diff <= RELATED_WINDOW_MS && diff < bestDiff) {
      best = incident;
      bestDiff = diff;
    }
  }
  return best;
}

export function DeploymentTimeline() {
  const deployments = useDeployments();
  const incidents = useIncidents();
  const services = useServices();

  if (deployments.isLoading) return <LoadingBlock />;
  const deps = deployments.data ?? [];
  const incs = incidents.data ?? [];
  if (deps.length === 0) return <EmptyState title="No deployments" />;

  const serviceName = (id: string) =>
    (services.data ?? []).find((s) => s.id === id)?.name ?? id;

  const all = [...deps, ...incs];
  const min = Math.min(...all.map((d) => new Date(d.startedAt).getTime()));
  const max = Math.max(
    ...all.map((d) => new Date(d.startedAt).getTime()),
    Date.now(),
  );
  const range = Math.max(1, max - min);
  const pct = (ts: string) =>
    ((new Date(ts).getTime() - min) / range) * 100;

  const sorted = [...deps].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return (
    <div className="space-y-6">
      <Card className="gap-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Crosshair className="text-info size-4" />
            Change timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mx-2 h-40">
            <div className="absolute top-9 right-0 left-0 h-px bg-border" />
            <div className="absolute top-5 flex w-full flex-col gap-1">
              {deps.map((dep) => {
                const related = relatedIncident(dep, incs);
                return (
                  <Tooltip key={dep.id} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "group absolute -ml-1 transition-transform hover:scale-110",
                          related ? "top-0" : "top-3",
                        )}
                        style={{ left: `${pct(dep.startedAt)}%` }}
                      >
                        <span
                          className={cn(
                            "flex size-3.5 items-center justify-center rounded-full border-2 border-background",
                            related ? "bg-critical" : "bg-info",
                          )}
                        >
                          <span className="size-1 rounded-full bg-background" />
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-mono text-xs">
                          {serviceName(dep.serviceId)} {dep.version} · {formatTime(dep.startedAt)}
                        </p>
                        <p className="text-primary-foreground/80 text-[11px]">{dep.description}</p>
                        {related ? (
                          <p className="font-mono text-[11px] text-primary-foreground/90">
                            ↔ within window of {related.id}
                          </p>
                        ) : null}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {incs.map((incident) => (
                <Tooltip key={incident.id} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/incidents/${incident.id}`}
                      className="absolute -ml-2 flex flex-col items-center"
                      style={{ left: `${pct(incident.startedAt)}%` }}
                    >
                      <span
                        className={cn(
                          "size-3 rounded-full border-2 border-background",
                          SEVERITY_META[incident.severity].badge === "critical" ? "bg-critical" : "bg-warning",
                        )}
                      />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {incident.id} · {incident.severity} · {formatTime(incident.startedAt)}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <div className="absolute top-20 flex w-full justify-between font-mono text-[10px] text-muted-foreground">
              <span>{formatTime(new Date(min).toISOString())}</span>
              <span>{formatTime(new Date(max).toISOString())}</span>
            </div>
            <div className="absolute top-24 flex items-center gap-4 font-mono text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-info" /> deployment</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-critical" /> deployment near incident</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning" /> incident</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Commit</TableHead>
                <TableHead>Related incident</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((dep) => {
                const related = relatedIncident(dep, incs);
                return (
                  <TableRow key={dep.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatTime(dep.startedAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {serviceName(dep.serviceId)}
                    </TableCell>
                    <TableCell className="font-mono">{dep.version}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          dep.status === "deployed" ? "success" : dep.status === "rolled_back" ? "warning" : "critical"
                        }
                        className="font-mono text-[10px]"
                      >
                        {dep.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{dep.author}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {dep.commit.slice(0, 7)}
                    </TableCell>
                    <TableCell>
                      {related ? (
                        <Link
                          href={`/incidents/${related.id}`}
                          className="text-info flex items-center gap-1 font-mono text-xs hover:underline"
                        >
                          <Rocket className="size-3" /> {related.id} +{formatTimeDelta(dep.startedAt, related.startedAt)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function formatTimeDelta(from: string, to: string): string {
  const diff = new Date(to).getTime() - new Date(from).getTime();
  const m = Math.floor(diff / 60_000);
  return `${m}m`;
}