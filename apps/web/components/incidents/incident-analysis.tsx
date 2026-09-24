"use client";

import * as React from "react";
import { FlaskConical, Loader2, RefreshCw, Sparkles } from "lucide-react";

import type { Investigation } from "@rootline/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rootline/ui";

import {
  useAnalyze,
  useInvestigationForIncident,
} from "@/features/analysis/use-analysis";
import { HypothesisCard } from "@/components/investigation/hypothesis-card";

export function IncidentAnalysis({ incidentId }: { incidentId: string }) {
  const investigation = useInvestigationForIncident(incidentId);
  const analyze = useAnalyze(incidentId);

  if (investigation.isLoading) {
    return (
      <AnalysisCard>
        <div className="h-16 animate-pulse rounded-lg border border-border/60 bg-card/40" />
      </AnalysisCard>
    );
  }

  if (investigation.data) {
    return (
      <AnalysisResults
        investigation={investigation.data}
        live={analyze.isPending}
      />
    );
  }

  const noInvestigation =
    !analyze.isPending && !analyze.isSuccess && !analyze.isError;

  return (
    <AnalysisCard>
      {noInvestigation ? (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <p className="text-sm font-medium">No AI investigation yet</p>
            <p className="text-muted-foreground text-xs">
              Correlate metrics, logs, deployments and traces to generate
              hypotheses for this incident.
            </p>
          </div>
          <Button
            className="sm:ml-auto"
            onClick={() => analyze.mutate()}
            disabled={analyze.isPending}
          >
            <Sparkles className="size-4" /> Run analysis
          </Button>
        </div>
      ) : analyze.isPending ? (
        <div className="flex items-center gap-4 rounded-lg border border-border/60 bg-card/40 p-5">
          <span className="relative flex size-8 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-md bg-info/20" />
            <span className="bg-info/15 text-info relative flex size-8 items-center justify-center rounded-md border border-info/20">
              <FlaskConical className="size-4" />
            </span>
          </span>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">
              Rootline is correlating signals…
            </p>
            <p className="text-muted-foreground text-xs">
              Cross-referencing metrics, logs, deployments and dependencies.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <p className="text-sm font-medium text-critical">Analysis failed</p>
            <p className="text-muted-foreground text-xs">
              {analyze.error?.message ??
                "The analysis pipeline could not complete."}
            </p>
          </div>
          <Button
            className="sm:ml-auto"
            variant="outline"
            onClick={() => {
              analyze.reset();
              analyze.mutate();
            }}
          >
            <RefreshCw className="size-4" /> Try again
          </Button>
        </div>
      )}
    </AnalysisCard>
  );
}

function AnalysisCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="gap-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="text-info size-4" /> AI Investigation
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function AnalysisResults({
  investigation,
  live = false,
}: {
  investigation: Investigation;
  live?: boolean;
}) {
  const ranked = [...investigation.hypotheses].sort(
    (a, b) => b.confidence - a.confidence,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info" className="gap-1.5">
          <Sparkles className="size-3" /> AI Investigation
        </Badge>
        {live ? (
          <Badge variant="warning" className="gap-1.5">
            <Loader2 className="size-3 animate-spin" /> live
          </Badge>
        ) : null}
        <span className="text-muted-foreground font-mono text-xs">
          generated {investigation.generatedAt.slice(11, 19)} UTC
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="info" className="font-mono text-[10px]">
            FACT
          </Badge>
          <Badge variant="warning" className="font-mono text-[10px]">
            INFERENCE
          </Badge>
          <Badge variant="muted" className="font-mono text-[10px]">
            RECOMMENDATION
          </Badge>
        </div>
      </div>

      {ranked.map((hypothesis, i) => (
        <HypothesisCard
          key={hypothesis.id}
          hypothesis={hypothesis}
          rank={i === 0 ? "Most likely cause" : `Alternative ${i}`}
        />
      ))}
    </div>
  );
}
