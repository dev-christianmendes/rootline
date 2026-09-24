"use client";

import { FlaskConical, Loader2, Sparkles } from "lucide-react";

import type { Investigation } from "@rootline/types";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@rootline/ui";

import { useAnalysisQuery } from "@/features/analysis/use-analysis";
import { HypothesisCard } from "@/components/investigation/hypothesis-card";

export function IncidentAnalysis({ incidentId }: { incidentId: string }) {
  const analysis = useAnalysisQuery(incidentId);

  if (analysis.isLoading) {
    return (
      <Card className="gap-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="text-info size-4" />
            AI Investigation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4 rounded-lg border border-border/60 bg-card/40 p-5">
          <span className="relative flex size-8 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-md bg-info/20" />
            <span className="bg-info/15 text-info relative flex size-8 items-center justify-center rounded-md border border-info/20">
              <FlaskConical className="size-4" />
            </span>
          </span>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Rootline is correlating signals…</p>
            <p className="text-muted-foreground text-xs">
              Cross-referencing metrics, logs, deployments and dependencies.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analysis.isError || !analysis.data) {
    return (
      <Card className="gap-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="text-info size-4" /> AI Investigation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No analysis available for this incident yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <AnalysisResults investigation={analysis.data} />;
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
        {live ? <Badge variant="warning" className="gap-1.5"><Loader2 className="size-3 animate-spin" /> live</Badge> : null}
        <span className="text-muted-foreground font-mono text-xs">
          generated {investigation.generatedAt.slice(11, 19)} UTC
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="info" className="font-mono text-[10px]">FACT</Badge>
          <Badge variant="warning" className="font-mono text-[10px]">INFERENCE</Badge>
          <Badge variant="muted" className="font-mono text-[10px]">RECOMMENDATION</Badge>
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