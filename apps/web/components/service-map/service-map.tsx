"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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

import type { Service, ServiceKind } from "@rootline/types";
import { Zap } from "lucide-react";
import { cn } from "@rootline/ui";

import { formatPercent, HEALTH_META } from "@/lib/format";
import { useIncidents } from "@/features/incidents/use-incidents";
import { useServices } from "@/features/services/use-services";

type ServiceNodeData = Record<string, unknown> & Service & { activeIncident: boolean };

type ServiceNode = Node<ServiceNodeData, "service">;

const KIND_LABEL: Record<ServiceKind, string> = {
  frontend: "Frontend",
  gateway: "Gateway",
  api: "API",
  worker: "Worker",
  data: "Database",
  cache: "Cache",
  message_bus: "Message bus",
};

const ROW_ORDER: ServiceKind[] = [
  "frontend",
  "gateway",
  "api",
  "worker",
  "data",
  "cache",
  "message_bus",
];

const HEALTH_BORDER: Record<Service["health"], string> = {
  healthy: "border-success/30",
  degraded: "border-warning/40",
  critical: "border-critical/50",
  unknown: "border-border",
};

function ServiceNodeView({ data }: NodeProps<ServiceNode>) {
  const health = HEALTH_META[data.health];
  return (
    <div className="relative min-w-[240px] flex-col">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <div
        className={cn(
          "relative rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-accent",
          HEALTH_BORDER[data.health],
        )}
      >
        {data.activeIncident ? (
          <span className="bg-critical text-primary-foreground absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full">
            <Zap className="size-3" />
          </span>
        ) : null}
        <div className="flex items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", health.dot)} />
          <span className="truncate text-sm font-medium">{data.name}</span>
          <span className="text-muted-foreground ml-auto font-mono text-[10px]">
            {KIND_LABEL[data.kind]}
          </span>
        </div>
        <div className="text-muted-foreground mt-1.5 flex items-center gap-3 font-mono text-[11px]">
          <span>
            <span className="text-foreground">{data.latencyMs}ms</span> lat
          </span>
          <span>
            <span className="text-foreground">{formatPercent(data.errorRate, 2)}</span> err
          </span>
          <span className="ml-auto">{data.version}</span>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { service: ServiceNodeView };

export function buildServiceGraph(
  services: Service[],
  activeIncidentIds: Set<string>,
): { nodes: ServiceNode[]; edges: Edge[] } {
  const rowsMap = new Map<ServiceKind, Service[]>();
  for (const service of services) {
    const list = rowsMap.get(service.kind) ?? [];
    list.push(service);
    rowsMap.set(service.kind, list);
  }

  const yOffsets = new Map<ServiceKind, number>();
  let y = 20;
  for (const kind of ROW_ORDER) {
    yOffsets.set(kind, y);
    y += ((rowsMap.get(kind)?.length ?? 1) > 0 ? 1 : 0) * 150;
  }

  const nodes: ServiceNode[] = [];
  for (const kind of ROW_ORDER) {
    const list = rowsMap.get(kind) ?? [];
    list.sort((a, b) => a.name.localeCompare(b.name));
    list.forEach((service, i) => {
      nodes.push({
        id: service.id,
        type: "service",
        position: { x: 30 + i * 280, y: yOffsets.get(kind) ?? 0 },
        data: {
          ...service,
          activeIncident: activeIncidentIds.has(service.id),
        },
      });
    });
  }

  const edges: Edge[] = [];
  for (const service of services) {
    for (const dep of service.dependencies) {
      edges.push({
        id: `e-${service.id}-${dep}`,
        source: service.id,
        target: dep,
        animated: false,
      });
    }
  }

  return { nodes, edges };
}

export function ServiceMap() {
  const router = useRouter();
  const services = useServices();
  const incidents = useIncidents();

  const activeIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const incident of incidents.data ?? []) {
      if (incident.status !== "RESOLVED") set.add(incident.serviceId);
    }
    return set;
  }, [incidents.data]);

  const { nodes, edges } = React.useMemo(
    () => buildServiceGraph(services.data ?? [], activeIds),
    [services.data, activeIds],
  );

  const onNodeClick = React.useCallback(
    (_: React.MouseEvent, node: ServiceNode) => {
      router.push(`/services/${node.id}`);
    },
    [router],
  );

  if (services.isLoading) {
    return <div className="h-[520px] animate-pulse rounded-lg border border-border/60 bg-card/40" />;
  }

  return (
    <ReactFlowProvider>
      <div className="h-[560px] overflow-hidden rounded-lg border border-border/70">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.25}
          maxZoom={1.5}
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
          nodesDraggable
          panOnScroll
          defaultEdgeOptions={{ style: { stroke: "#3d3d44", strokeWidth: 1.5 }, animated: false }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#1f1f23" />
          <Controls position="bottom-right" showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            maskColor="rgba(10,10,11,0.8)"
            nodeColor={(node) => {
              const heat = (node.data as { health?: Service["health"] }).health ?? "unknown";
              return { healthy: "#22c55e", degraded: "#f59e0b", critical: "#ef4444", unknown: "#3d3d44" }[heat];
            }}
          />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}