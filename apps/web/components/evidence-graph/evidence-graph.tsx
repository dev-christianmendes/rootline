"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import type { EvidenceSourceType, Hypothesis, Incident } from "@rootline/types";
import { cn } from "@rootline/ui";

import { formatTime } from "@/lib/format";
import { chartColor } from "@/lib/chart-colors";

/* ------------------------------------------------------------------ */
/* Node model                                                          */
/* ------------------------------------------------------------------ */

type Tone = "info" | "warning" | "critical" | "success" | "muted";

type EvidenceNodeData = {
  label: string;
  sub?: string;
  tone: Tone;
  meta?: string;
};

export type EvidenceGraphNode = Node<EvidenceNodeData, "evidence">;

const TONE_STYLES: Record<Tone, { box: string; bar: string; badge: string }> = {
  info: {
    box: "border-info/30 bg-info/[0.06]",
    bar: "bg-info",
    badge: "text-info",
  },
  warning: {
    box: "border-warning/30 bg-warning/[0.06]",
    bar: "bg-warning",
    badge: "text-warning",
  },
  critical: {
    box: "border-critical/30 bg-critical/[0.06]",
    bar: "bg-critical",
    badge: "text-critical",
  },
  success: {
    box: "border-success/30 bg-success/[0.06]",
    bar: "bg-success",
    badge: "text-success",
  },
  muted: {
    box: "border-border bg-card/60",
    bar: "bg-muted-foreground",
    badge: "text-muted-foreground",
  },
};

const TONE_COLOR: Record<Tone, string> = {
  info: chartColor("info"),
  warning: chartColor("warning"),
  critical: chartColor("critical"),
  success: chartColor("success"),
  muted: chartColor("muted"),
};

function EvidenceNode({ data }: NodeProps<EvidenceGraphNode>) {
  const tone = TONE_STYLES[data.tone];
  return (
    <div
      className={cn(
        "relative min-w-[220px] rounded-lg border px-3 py-2.5 pr-6",
        tone.box,
      )}
    >
      <span
        className={cn(
          "absolute top-0 bottom-0 left-0 w-0.5 rounded-l-lg",
          tone.bar,
        )}
      />
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <p
        className={cn(
          "font-mono text-[10px] tracking-widest uppercase",
          tone.badge,
        )}
      >
        {data.label}
      </p>
      {data.sub ? (
        <p className="mt-0.5 text-sm font-medium leading-snug">{data.sub}</p>
      ) : null}
      {data.meta ? (
        <p className="text-muted-foreground mt-1 font-mono text-[11px]">
          {data.meta}
        </p>
      ) : null}
    </div>
  );
}

const nodeTypes = { evidence: EvidenceNode };

/* ------------------------------------------------------------------ */
/* Graph builder (spec §18)                                            */
/* ------------------------------------------------------------------ */

const SOURCE_TYPE_LABEL: Record<EvidenceSourceType, string> = {
  metrics: "Metrics",
  logs: "Logs",
  deployment: "Deployment",
  trace: "Trace",
  dependency: "Dependency",
  infrastructure: "Infrastructure",
  incident: "Incident",
};

const SOURCE_TONE: Record<EvidenceSourceType, Tone> = {
  metrics: "critical",
  logs: "warning",
  deployment: "info",
  trace: "critical",
  dependency: "success",
  infrastructure: "muted",
  incident: "warning",
};

const VERSION_RE = /v?\d+(?:\.\d+){1,3}/;
const MAX_SIGNALS = 4;

function minutesBetween(
  a: string | undefined,
  b: string | undefined,
): number | null {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 60_000);
}

export function buildEvidenceGraph(
  incident: Incident,
  hypothesis: Hypothesis,
  serviceName: string,
): { nodes: EvidenceGraphNode[]; edges: Edge[] } {
  const allEvidence = [...hypothesis.evidence, ...hypothesis.counterEvidence];

  const deployment = allEvidence.find((e) => e.sourceType === "deployment");
  const deploymentVersion =
    deployment?.detail.match(VERSION_RE)?.[0] ??
    deployment?.label ??
    "recent deployment";

  const signals = allEvidence
    .filter((e) => e.sourceType !== "deployment")
    .sort(
      (a, b) =>
        (a.impact === "supporting" ? 0 : 1) -
        (b.impact === "supporting" ? 0 : 1),
    )
    .slice(0, MAX_SIGNALS)
    .map((ev) => ({
      ev,
      label: SOURCE_TYPE_LABEL[ev.sourceType],
      tone: SOURCE_TONE[ev.sourceType] as Tone,
    }));

  const incidentTs = incident.detectedAt ?? incident.startedAt;
  const depDelta = minutesBetween(deployment?.time, incidentTs);

  const cx = 220;
  const yDeployment = 10;
  const yService = 150;
  const ySignals = 300;
  const yIncident = 460;
  const yRoot = 610;

  const n = (
    id: string,
    x: number,
    y: number,
    node: Omit<EvidenceGraphNode["data"], "tone"> & { tone: Tone },
  ): EvidenceGraphNode => ({
    id,
    type: "evidence",
    position: { x, y },
    data: { ...node },
  });

  const nodes: EvidenceGraphNode[] = [];
  const edges: Edge[] = [];

  if (deployment) {
    nodes.push(
      n("deployment", cx, yDeployment, {
        label: "Deployment",
        sub: deploymentVersion,
        meta: deployment.time ? formatTime(deployment.time) : undefined,
        tone: "info",
      }),
    );
    edges.push({
      id: "e-dep-service",
      source: "deployment",
      target: "service",
      label: depDelta && depDelta > 0 ? `+${depDelta}m` : undefined,
    });
  }

  nodes.push(
    n("service", cx, yService, {
      label: "Service",
      sub: serviceName,
      meta: incident.severity,
      tone: "muted",
    }),
  );

  signals.forEach((signal, i) => {
    const x = cx + (i - (signals.length - 1) / 2) * 240;
    nodes.push(
      n(`sig-${signal.ev.id}`, x, ySignals, {
        label: signal.label,
        sub: signal.ev.label,
        meta: `${signal.ev.impact}${signal.ev.time ? ` · ${formatTime(signal.ev.time)}` : ""}`,
        tone: signal.tone,
      }),
    );
    edges.push(
      {
        id: `e-service-${signal.ev.id}`,
        source: "service",
        target: `sig-${signal.ev.id}`,
      },
      {
        id: `e-${signal.ev.id}-inc`,
        source: `sig-${signal.ev.id}`,
        target: "incident",
      },
    );
  });

  nodes.push(
    n("incident", cx, yIncident, {
      label: "Incident",
      sub: incident.id,
      meta: incident.severity,
      tone: "critical",
    }),
    n("root", cx, yRoot, {
      label: "Root cause",
      sub: hypothesis.title,
      meta: `confidence ${Math.round(hypothesis.confidence * 100)}%`,
      tone: "success",
    }),
  );

  edges.push({ id: "e-inc-root", source: "incident", target: "root" });

  return { nodes, edges };
}

/* ------------------------------------------------------------------ */
/* Viewer                                                              */
/* ------------------------------------------------------------------ */

export function EvidenceGraph({
  incident,
  hypothesis,
  serviceName,
  className,
  fitView = true,
}: {
  incident: Incident;
  hypothesis: Hypothesis;
  serviceName: string;
  className?: string;
  fitView?: boolean;
}) {
  const { nodes, edges } = React.useMemo(
    () => buildEvidenceGraph(incident, hypothesis, serviceName),
    [incident, hypothesis, serviceName],
  );

  return (
    <ReactFlowProvider>
      <div
        className={cn(
          "h-[440px] overflow-hidden rounded-lg border border-border/70",
          className,
        )}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView={fitView}
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.5}
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            style: { stroke: chartColor("border"), strokeWidth: 1.5 },
            labelStyle: {
              fill: chartColor("muted"),
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            },
            labelBgStyle: { fill: chartColor("background"), fillOpacity: 0.9 },
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1}
            color={chartColor("border")}
          />
          <Controls position="bottom-right" showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            maskColor={chartColor("background")}
            nodeColor={(node) => {
              const tone =
                (node.data as unknown as EvidenceNodeData)?.tone ?? "muted";
              return TONE_COLOR[tone];
            }}
          />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}
