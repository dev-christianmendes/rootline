"use client";

import Link from "next/link";
import { ArrowUpRight, FlaskConical, Sparkles } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rootline/ui";

import { useInvestigations } from "@/features/analysis/use-analysis";
import { useIncidents } from "@/features/incidents/use-incidents";
import { formatTime, formatDuration } from "@/lib/format";
import { SeverityBadge, StatusBadge } from "@/components/common/badges";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/common/states";
import { ConfidenceBar } from "@/components/investigation/hypothesis-card";

export function InvestigationsCenter() {
  const investigations = useInvestigations();
  const incidents = useIncidents();

  if (investigations.isLoading) return <LoadingBlock />;
  if (investigations.isError) {
    return (
      <ErrorState
        title="Unable to load investigations"
        onRetry={() => investigations.refetch()}
      />
    );
  }

  const list = investigations.data ?? [];

  return (
    <div className="space-y-4">
      {list.length === 0 ? (
        <EmptyState title="No investigations yet" detail="Run an analysis from an incident to start investigating." />
      ) : (
        list.map((inv) => {
          const incident = (incidents.data ?? []).find(
            (i) => i.id === inv.incidentId,
          );
          return (
            <Card key={inv.id} className="gap-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FlaskConical className="text-info size-4" />
                  <span className="font-mono">{inv.id}</span>
                  {incident ? (
                    <>
                      <SeverityBadge severity={incident.severity} />
                      <StatusBadge status={incident.status} />
                    </>
                  ) : null}
                </CardTitle>
                <CardAction>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/investigations/${inv.id}`}>
                      Open <ArrowUpRight className="size-3.5" />
                    </Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">
                  {incident?.title ?? inv.incidentId}
                  {incident ? (
                    <span className="text-muted-foreground ml-2 font-mono text-xs">
                      {formatTime(incident.startedAt)} · duration{" "}
                      {formatDuration(incident.startedAt, incident.resolvedAt)}
                    </span>
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-4">
                  {inv.hypotheses.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2">
                      <Sparkles className="text-info size-3.5" />
                      <span className="max-w-56 truncate text-sm">{h.title}</span>
                      <ConfidenceBar confidence={h.confidence} />
                      <Badge variant={h.confidence >= 0.6 ? "info" : "muted"} className="font-mono text-[10px]">
                        {h.evidence.length + h.counterEvidence.length} ev
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}