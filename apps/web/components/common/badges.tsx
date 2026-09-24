import * as React from "react";

import type { IncidentStatus, Severity } from "@rootline/types";
import { Badge, cn } from "@rootline/ui";

import { SEVERITY_META, STATUS_META } from "@/lib/format";

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  const meta = SEVERITY_META[severity];
  return (
    <Badge variant={meta.badge} className={cn("font-mono", className)}>
      {severity}
    </Badge>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: IncidentStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <Badge variant={meta.badge} className={className}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {status}
    </Badge>
  );
}

export function HealthDot({
  health,
  className,
}: {
  health: "healthy" | "degraded" | "critical" | "unknown";
  className?: string;
}) {
  const dot =
    health === "healthy"
      ? "bg-success"
      : health === "degraded"
        ? "bg-warning"
        : health === "critical"
          ? "bg-critical"
          : "bg-muted-foreground";
  return <span className={cn("size-2 shrink-0 rounded-full", dot, className)} />;
}