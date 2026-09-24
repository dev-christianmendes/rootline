"use client";

import { Check, GitCompareArrows, Rocket, ShieldQuestion, X } from "lucide-react";

import type { Evidence, Hypothesis } from "@rootline/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from "@rootline/ui";

import { formatTime } from "@/lib/format";
import { useHypothesisStore } from "@/features/analysis/hypothesis-store";

const KIND_META: Record<
  Evidence["kind"],
  { label: string; badge: "info" | "warning" | "muted" }
> = {
  fact: { label: "FACT", badge: "info" },
  inference: { label: "INFERENCE", badge: "warning" },
  recommendation: { label: "RECOMMENDATION", badge: "muted" },
};

function confidenceColor(confidence: number): string {
  if (confidence >= 0.6) return "bg-info";
  if (confidence >= 0.3) return "bg-warning";
  return "bg-muted-foreground";
}

function EvidenceItem({ evidence }: { evidence: Evidence }) {
  const kind = KIND_META[evidence.kind];
  const isCounter = evidence.impact === "counter";

  return (
    <div className="flex items-start gap-2.5 rounded-md border border-border/60 bg-card/40 px-3 py-2">
      {isCounter ? (
        <X className="text-critical mt-0.5 size-3.5 shrink-0" />
      ) : (
        <Check className="text-success mt-0.5 size-3.5 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={kind.badge} className="font-mono text-[10px]">
            {kind.label}
          </Badge>
          <span className="text-sm font-medium">{evidence.label}</span>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
          {evidence.detail}
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">
          {evidence.source}
          {evidence.time ? (
            <span className="text-muted-foreground ml-2">
              @ {formatTime(evidence.time)}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  return (
    <div className="flex w-28 items-center gap-2">
      <div className="bg-muted h-1.5 w-20 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full", confidenceColor(confidence))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-9 font-mono text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

export function HypothesisCard({
  hypothesis,
  rank,
}: {
  hypothesis: Hypothesis;
  rank?: string;
}) {
  const status = useHypothesisStore((s) => s.statuses[hypothesis.id]);
  const setStatus = useHypothesisStore((s) => s.setStatus);

  const effectiveStatus = status ?? hypothesis.status;
  const accepted = effectiveStatus === "accepted";
  const dismissed = effectiveStatus === "dismissed";

  const evidenceCount = hypothesis.evidence.length;
  const counterCount = hypothesis.counterEvidence.length;

  return (
    <Card
      className={cn(
        "gap-0",
        dismissed && "opacity-60",
        accepted &&
          "border-success/50 bg-success/[0.03]",
      )}
    >
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {rank ? (
            <Badge variant="secondary" className="font-mono">
              {rank}
            </Badge>
          ) : null}
          <Badge
            variant={
              accepted ? "success" : dismissed ? "muted" : "info"
            }
            className="font-mono"
          >
            {accepted ? "ACCEPTED" : dismissed ? "DISMISSED" : "CANDIDATE"}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground text-xs">confidence</span>
            <ConfidenceBar confidence={hypothesis.confidence} />
          </div>
        </div>
        <CardTitle className="text-base">{hypothesis.title}</CardTitle>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {hypothesis.summary}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Evidence · {evidenceCount}
          </p>
          {hypothesis.evidence.map((ev) => (
            <EvidenceItem key={ev.id} evidence={ev} />
          ))}
        </div>

        {counterCount > 0 ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Counter-evidence · {counterCount}
            </p>
            {hypothesis.counterEvidence.map((ev) => (
              <EvidenceItem key={ev.id} evidence={ev} />
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatus(hypothesis.id, "accepted")}
          >
            <ShieldQuestion className="size-3.5" />
            Accept cause
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setStatus(hypothesis.id, "dismissed")
                  }
                >
                  <X className="size-3.5" />
                  Dismiss
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Discard this hypothesis from the investigation.
            </TooltipContent>
          </Tooltip>
          <Button size="sm" variant="ghost">
            <Rocket className="size-3.5" />
            Inspect deployment
          </Button>
          <Button size="sm" variant="ghost">
            <GitCompareArrows className="size-3.5" />
            Compare versions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}