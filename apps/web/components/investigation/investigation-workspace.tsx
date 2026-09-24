"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, Database, FileClock, Layers, ScrollText, Waypoints, X } from "lucide-react";

import type { Investigation } from "@rootline/types";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, cn } from "@rootline/ui";

import { useInvestigation } from "@/features/analysis/use-analysis";
import { useIncidents } from "@/features/incidents/use-incidents";
import { useDeployments } from "@/features/deployments/use-deployments";
import { useServiceMetrics, useServices } from "@/features/services/use-services";
import { useIncidentLogs, useIncidentTraces } from "@/features/telemetry/use-telemetry";
import { formatTime } from "@/lib/format";
import { SeverityBadge, StatusBadge } from "@/components/common/badges";
import { ErrorState, LoadingBlock, PageHeader } from "@/components/common/states";
import { AnalysisResults } from "@/components/incidents/incident-analysis";
import { EvidenceGraph } from "@/components/evidence-graph/evidence-graph";

export function InvestigationWorkspace({ investigationId }: { investigationId: string }) {
  const investigationQ = useInvestigation(investigationId);
  const incidents = useIncidents();

  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  if (investigationQ.isLoading) return <LoadingBlock />;
  if (investigationQ.isError || !investigationQ.data) {
    return (
      <ErrorState
        title="Investigation not found"
        detail={investigationQ.error?.message}
        onRetry={() => investigationQ.refetch()}
      />
    );
  }

  const investigation = investigationQ.data;
  const incident = (incidents.data ?? []).find(
    (i) => i.id === investigation.incidentId,
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Investigation
            {incident ? (
              <>
                <Link href={`/incidents/${incident.id}`} className="font-mono text-base text-muted-foreground hover:underline">
                  {incident.id}
                </Link>
                <SeverityBadge severity={incident.severity} />
                <StatusBadge status={incident.status} />
              </>
            ) : (
              <span className="font-mono text-base text-muted-foreground">{investigationId}</span>
            )}
          </span>
        }
        description={
          incident?.summary ??
          "Investigation workspace — select signals from the rail and correlate evidence."
        }
        actions={
          incident ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/incidents/${incident.id}`}>
                <ArrowLeft className="size-4" /> Back to incident
              </Link>
            </Button>
          ) : null
        }
      />

      {incident ? (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <EvidenceRail
            incidentId={incident.id}
            serviceId={incident.serviceId}
            selected={selected}
            onToggle={toggle}
          />

          <div className="space-y-6">
            <SelectedEvidenceChips selected={selected} onClear={() => setSelected(new Set())} />

            <AnalysisResults investigation={investigation} live />
            {incident ? (
              <InvestigationGraphs
                investigation={investigation}
                incident={incident}
                serviceId={incident.serviceId}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Incident data unavailable.</p>
      )}
    </div>
  );
}

function InvestigationGraphs({
  investigation,
  incident,
  serviceId,
}: {
  investigation: Investigation;
  incident: NonNullable<ReturnType<typeof useIncidents>["data"]>[number];
  serviceId: string;
}) {
  const topHypothesis = [...investigation.hypotheses].sort(
    (a, b) => b.confidence - a.confidence,
  )[0];
  if (!topHypothesis) return null;
  return (
    <Card className="gap-0">
      <CardHeader>
        <CardTitle className="text-sm">Evidence graph</CardTitle>
      </CardHeader>
      <CardContent>
        <EvidenceGraph incident={incident} hypothesis={topHypothesis} serviceName={serviceId} />
      </CardContent>
    </Card>
  );
}

function EvidenceRail({
  incidentId,
  serviceId,
  selected,
  onToggle,
}: {
  incidentId: string;
  serviceId: string;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const metrics = useServiceMetrics(serviceId);
  const logs = useIncidentLogs(incidentId);
  const traces = useIncidentTraces(incidentId);
  const deployments = useDeployments();
  const incidents = useIncidents();
  const incident = (incidents.data ?? []).find((i) => i.id === incidentId);
  const services = useServices();

  const serviceDeployments = (deployments.data ?? []).filter(
    (d) => d.serviceId === serviceId,
  );

  const affected = (incident?.affectedServices ?? []).map((a) => a.serviceId);

  const items: { id: string; label: string; detail: string; icon: React.ReactNode }[] = [
    ...(metrics.data ?? []).map((m) => ({
      id: `metric:${m.metric}`,
      label: `${m.metric.replace("_", " ")}`,
      detail: `${m.points.length} samples`,
      icon: <Database className="size-3.5" />,
    })),
    ...(logs.data ?? []).slice(0, 6).map((l) => ({
      id: `log:${l.id}`,
      label: l.message,
      detail: `${l.level} · ${formatTime(l.timestamp)}`,
      icon: <ScrollText className="size-3.5" />,
    })),
    ...serviceDeployments.map((d) => ({
      id: `deploy:${d.id}`,
      label: `${d.version} · ${d.status}`,
      detail: d.description,
      icon: <Layers className="size-3.5" />,
    })),
    ...(traces.data ?? []).slice(0, 3).map((t) => ({
      id: `trace:${t.traceId}`,
      label: t.name,
      detail: `${t.status} · ${formatTime(t.startedAt)}`,
      icon: <Waypoints className="size-3.5" />,
    })),
    ...affected.map((id) => ({
      id: `service:${id}`,
      label: (services.data ?? []).find((s) => s.id === id)?.name ?? id,
      detail: "affected service",
      icon: <FileClock className="size-3.5" />,
    })),
  ];

  return (
    <aside className="space-y-4">
      <Card className="gap-0">
        <CardHeader>
          <CardTitle className="text-sm">Evidence rail</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          <div className="flex items-center gap-2 px-2 pb-2 text-xs text-muted-foreground">
            Select signals to add to the investigation.
          </div>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto px-2">
              {items.map((item) => {
                const active = selected.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onToggle(item.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md border px-2 py-2 text-left transition-colors",
                      active
                        ? "border-info/40 bg-info/[0.06]"
                        : "border-border/50 hover:bg-accent/50",
                    )}
                  >
                    <span className={cn("mt-0.5", active ? "text-info" : "text-muted-foreground")}>
                      {active ? <Check className="size-3.5" /> : item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{item.label}</span>
                      <span className="text-muted-foreground block truncate text-[11px]">
                        {item.detail}
                      </span>
                    </span>
                  </button>
                );
              })}
              {items.length === 0 ? (
                <p className="text-muted-foreground px-2 py-4 text-xs">
                  No signals to display.
                </p>
              ) : null}
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

function SelectedEvidenceChips({
  selected,
  onClear,
}: {
  selected: Set<string>;
  onClear: () => void;
}) {
  if (selected.size === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 px-4 py-3 text-xs text-muted-foreground">
        No evidence selected yet — pick signals in the rail to include them in the
        investigation.
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2.5">
      <span className="text-xs font-medium">Selected evidence · {selected.size}</span>
      <Badge variant="secondary" className="text-muted-foreground">
        {[...selected].map((id) => id.split(":")[0]).join(", ")}
      </Badge>
      <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={onClear}>
        <X className="size-3.5" /> Clear
      </Button>
    </div>
  );
}