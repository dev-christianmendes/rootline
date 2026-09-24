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

import type { Hypothesis, Incident } from "@rootline/types";
import { cn } from "@rootline/ui";

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

function EvidenceNode({ data }: NodeProps<EvidenceGraphNode>) {
  const tone = TONE_STYLES[data.tone];
  return (
    <div className={cn("relative min-w-[220px] rounded-lg border px-3 py-2.5 pr-6", tone.box)}>
      <span className={cn("absolute top-0 bottom-0 left-0 w-0.5 rounded-l-lg", tone.bar)} />
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <p className={cn("font-mono text-[10px] tracking-widest uppercase", tone.badge)}>{data.label}</p>
      {data.sub ? <p className="mt-0.5 text-sm font-medium leading-snug">{data.sub}</p> : null}
      {data.meta ? <p className="text-muted-foreground mt-1 font-mono text-[11px]">{data.meta}</p> : null}
    </div>
  );
}

const nodeTypes = { evidence: EvidenceNode };

/* ------------------------------------------------------------------ */
/* Graph builder (spec §18)                                            */
/* ------------------------------------------------------------------ */

export interface EvidenceGraphDatum {
  deployment: { version: string; timeLabel: string };
  service: { name: string; healthLabel: string };
  signals: { label: string; sub: string; tone: Tone }[];
  incident: { id: string; severity: string };
  rootCause: { label: string; confidence: string };
}

export function buildEvidenceGraph(
  incident: Incident,
  hypothesis: Hypothesis,
  serviceName: string,
): { nodes: EvidenceGraphNode[]; edges: Edge[] } {
  const data: EvidenceGraphDatum = {
    deployment: {
      version: hypothesis.evidence.find((e) => e.sourceType === "deployment")?.detail ?? "v2.8.1",
      timeLabel: "14:02",
    },
    service: { name: serviceName, healthLabel: incident.severity },
    signals: [
      { label: "HTTP 500", sub: "+38% error rate", tone: "critical" },
      { label: "Latency", sub: "↑ up to 4x", tone: "warning" },
    ],
    incident: { id: incident.id, severity: incident.severity },
    rootCause: {
      label: hypothesis.title,
      confidence: `${Math.round(hypothesis.confidence * 100)}%`,
    },
  };

  const n = (id: string, x: number, y: number, node: Omit<EvidenceGraphNode["data"], "tone"> & { tone: Tone }): EvidenceGraphNode => ({
    id,
    type: "evidence",
    position: { x, y },
    data: { ...node },
  });

  const nodes: EvidenceGraphNode[] = [
    n("deployment", 140, 0, {
      label: "Deployment",
      sub: data.deployment.version.split(" ").pop() ?? data.deployment.version,
      meta: "14:02",
      tone: "info",
    }),
    n("service", 140, 130, {
      label: "Service",
      sub: data.service.name,
      meta: data.service.healthLabel,
      tone: "muted",
    }),
    n("sig-500", 0, 270, { ...data.signals[0]!, tone: "critical" }),
    n("sig-latency", 280, 270, { ...data.signals[1]!, tone: "warning" }),
    n("incident", 130, 420, {
      label: "Incident",
      sub: data.incident.id,
      meta: data.incident.severity,
      tone: "critical",
    }),
    n("root", 60, 560, {
      label: "Root cause",
      sub: data.rootCause.label,
      meta: `confidence ${data.rootCause.confidence}`,
      tone: "success",
    }),
  ];

  const edges: Edge[] = [
    { id: "e-dep-service", source: "deployment", target: "service", label: "+4m" },
    { id: "e-service-500", source: "service", target: "sig-500" },
    { id: "e-service-lat", source: "service", target: "sig-latency" },
    { id: "e-500-inc", source: "sig-500", target: "incident", label: "38%" },
    { id: "e-lat-inc", source: "sig-latency", target: "incident" },
    { id: "e-inc-root", source: "incident", target: "root" },
  ];

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
      <div className={cn("h-[440px] overflow-hidden rounded-lg border border-border/70", className)}>
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
          defaultEdgeOptions={{ style: { stroke: "#3d3d44", strokeWidth: 1.5 }, labelStyle: { fill: "#8b8b93", fontSize: 10 }, labelBgStyle: { fill: "#0a0a0b" } }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#1f1f23" />
          <Controls position="bottom-right" showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            maskColor="rgba(10,10,11,0.8)"
            nodeColor={(node) => {
              const tone = (node.data as unknown as EvidenceNodeData)?.tone ?? "muted";
              return TONE_STYLES[tone].bar;
            }}
          />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}