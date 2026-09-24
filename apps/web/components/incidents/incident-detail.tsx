"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import type { Incident } from "@rootline/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
  cn,
} from "@rootline/ui";

import { useIncident, useMutationIncident } from "@/features/incidents/use-incidents";
import { useServices } from "@/features/services/use-services";
import {
  formatDuration,
  formatTime,
  nextStatuses,
  STATUS_META,
} from "@/lib/format";
import { HealthDot, SeverityBadge, StatusBadge } from "@/components/common/badges";
import { ErrorState, LoadingBlock, PageHeader, SectionLabel } from "@/components/common/states";
import { StatusFlow } from "@/components/incidents/status-flow";
import { IncidentAnalysis } from "@/components/incidents/incident-analysis";
import { TelemetrySections } from "@/components/incidents/telemetry-sections";
import { Timeline } from "@/components/incidents/timeline";
import { ResolveDialog } from "@/components/incidents/resolve-dialog";
import { useAnalysisQuery } from "@/features/analysis/use-analysis";
import { EvidenceGraph } from "@/components/evidence-graph/evidence-graph";

export function IncidentDetail({ incidentId }: { incidentId: string }) {
  const incidentQ = useIncident(incidentId);
  const services = useServices();
  const analysis = useAnalysisQuery(incidentId);
  const [resolveOpen, setResolveOpen] = React.useState(false);

  if (incidentQ.isLoading) return <LoadingBlock />;
  if (incidentQ.isError || !incidentQ.data) {
    return (
      <ErrorState
        title="Incident not found"
        detail={incidentQ.error?.message}
        onRetry={() => incidentQ.refetch()}
      />
    );
  }

  const incident = incidentQ.data;
  const serviceName =
    (services.data ?? []).find((s) => s.id === incident.serviceId)?.name ??
    incident.serviceId;

  const topHypothesis = (analysis.data?.hypotheses ?? []).sort(
    (a, b) => b.confidence - a.confidence,
  )[0];

  return (
    <div className="space-y-6">
      <IncidentHeader
        incident={incident}
        serviceName={serviceName}
        onResolve={() => setResolveOpen(true)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="gap-0">
            <CardHeader>
              <CardTitle className="text-sm">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed">{incident.summary}</p>
              <div className="rounded-md border border-border/60 bg-card/40 p-3">
                <SectionLabel>Impact</SectionLabel>
                <p className="mt-1 text-sm">{incident.impact}</p>
              </div>
            </CardContent>
          </Card>

          <IncidentAnalysis incidentId={incidentId} />

          <TelemetrySections incident={incident} />
        </div>

        <div className="space-y-6">
          <StatusCard incident={incident} />

          <Card className="gap-0">
            <CardHeader>
              <CardTitle className="text-sm">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline events={incident.timeline} />
            </CardContent>
          </Card>

          <Card className="gap-0">
            <CardHeader>
              <CardTitle className="text-sm">Affected services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {incident.affectedServices.length === 0 ? (
                <p className="text-muted-foreground text-sm">No affected services.</p>
              ) : (
                incident.affectedServices.map((affected) => {
                  const svc = (services.data ?? []).find((s) => s.id === affected.serviceId);
                  return (
                    <div key={affected.serviceId} className="flex items-start gap-2.5 rounded-md border border-border/60 p-2.5">
                      <HealthDot health={svc?.health ?? "unknown"} className="mt-1.5" />
                      <div className="min-w-0">
                        <Link href={`/services/${affected.serviceId}`} className="text-sm font-medium hover:underline">
                          {svc?.name ?? affected.serviceId}
                        </Link>
                        <p className="text-muted-foreground text-xs">{affected.impact}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {topHypothesis ? (
        <Card className="gap-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Evidence graph</CardTitle>
            <Link href={`/investigations/inv-${incident.id.replace("INC-", "").toLowerCase()}`} className="text-info flex items-center gap-1 text-xs hover:underline">
              Open investigation <ArrowUpRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <EvidenceGraph incident={incident} hypothesis={topHypothesis} serviceName={serviceName} />
          </CardContent>
        </Card>
      ) : null}

      <ResolveDialog incident={incident} open={resolveOpen} onOpenChange={setResolveOpen} />
    </div>
  );
}

function IncidentHeader({
  incident,
  serviceName,
  onResolve,
}: {
  incident: Incident;
  serviceName: string;
  onResolve: () => void;
}) {
  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base text-muted-foreground">{incident.id}</span>
            <SeverityBadge severity={incident.severity} className="text-sm" />
          </span>
        }
        actions={
          incident.status !== "RESOLVED" ? (
            <>
              <Button asChild variant="outline">
                <Link href={`/investigations/inv-${incident.id.replace("INC-", "").toLowerCase()}`}>
                  Investigate <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
              <Button onClick={onResolve}>
                <CheckCircle2 className="size-4" /> Resolve
              </Button>
            </>
          ) : (
            <StatusBadge status={incident.status} className="px-3 py-1" />
          )
        }
      />

      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{incident.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{incident.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border/60 bg-card/40 px-4 py-3 font-mono text-xs">
          <span className="text-muted-foreground">
            service <span className="text-foreground">{serviceName}</span>
          </span>
          <span className="text-muted-foreground">
            started <span className="text-foreground">{formatTime(incident.startedAt)}</span>
          </span>
          <span className="text-muted-foreground">
            detected <span className="text-foreground">{formatTime(incident.detectedAt)}</span>
          </span>
          <span className="text-muted-foreground">
            duration <span className="text-warning">{formatDuration(incident.startedAt, incident.resolvedAt)}</span>
          </span>
          <span className="text-muted-foreground">
            assignee <span className="text-foreground">{incident.assignee}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ incident }: { incident: Incident }) {
  const mutation = useMutationIncident(incident.id);
  const next = nextStatuses(incident.status);
  const meta = STATUS_META[incident.status];

  const transition = (status: Incident["status"]) => {
    mutation.mutate(
      { status },
      {
        onSuccess: (updated) =>
          toast.success(`Status moved to ${updated.status}`, {
            description: `${incident.id} → ${updated.status}.`,
          }),
        onError: (error) => toast.error("Transition failed", { description: error.message }),
      },
    );
  };

  return (
    <Card className="gap-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          Status
          <Badge variant={meta.badge} className="ml-auto">
            <span className={cn("size-1.5 rounded-full", meta.dot)} />
            {incident.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <StatusFlow status={incident.status} />
        <Separator />
        {next.length > 0 ? (
          <div className="space-y-2">
            <SectionLabel>Advance flow</SectionLabel>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  Move status <ChevronDown className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Available transitions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {next.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => transition(s)}>
                    <span className={cn("size-2 rounded-full", STATUS_META[s].dot)} />
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
        {incident.resolution ? (
          <div className="rounded-md border border-success/20 bg-success/[0.04] p-3 space-y-2">
            <SectionLabel className="text-success">Resolution</SectionLabel>
            <p className="text-sm font-medium">{incident.resolution.rootCause}</p>
            <p className="text-muted-foreground text-xs leading-relaxed">{incident.resolution.summary}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              by {incident.resolution.resolvedBy} · {formatTime(incident.resolution.resolvedAt)}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}