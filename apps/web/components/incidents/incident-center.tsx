"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import type { IncidentStatus, Severity } from "@rootline/types";
import {
  Button,
  Card,
  CardContent,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
  Pagination,
} from "@rootline/ui";

import { useIncidents } from "@/features/incidents/use-incidents";
import { formatDuration, formatTime } from "@/lib/format";
import { SeverityBadge, StatusBadge } from "@/components/common/badges";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
} from "@/components/common/states";
import { useServiceNames } from "@/features/services/use-services";
import { NewIncidentDialog } from "./new-incident-dialog";
import { useIncidentWebSocket } from "@/hooks/use-incident-websocket";

const ALL_SEVERITIES: Severity[] = ["P1", "P2", "P3", "P4"];
const ALL_STATUSES: IncidentStatus[] = [
  "DETECTED",
  "INVESTIGATING",
  "MITIGATING",
  "MONITORING",
  "RESOLVED",
];

export function IncidentCenter() {
  const [page, setPage] = useState(1);
  const limit = 50;
  const offset = (page - 1) * 50;

  const [query, setQuery] = useState("");
  const [severities, setSeverities] = useState<Severity[]>([]);
  const [statuses, setStatuses] = useState<IncidentStatus[]>([]);
  const [creating, setCreating] = useState(false);

  // Pass search/filter params to the API
  const incidentsParams = {
    offset,
    limit: 50,
    q: query || undefined,
    severity: severities.length === 1 ? severities[0] : undefined,
    status: statuses.length === 1 ? statuses[0] : undefined,
  };

  const incidents = useIncidents(incidentsParams);
  const serviceName = useServiceNames();

  // Connect to WebSocket for the first incident in the list (or first active)
  const firstActiveIncident = useMemo(() => {
    return (incidents.data?.items ?? []).find((i) => i.status !== "RESOLVED");
  }, [incidents.data?.items]);

  const { isConnected: wsConnected } = useIncidentWebSocket({
    incidentId: firstActiveIncident?.id ?? "",
    enabled: !!firstActiveIncident,
    onIncidentUpdate: () => {
      // Update the local cache via react-query
      incidents.refetch();
    },
  });

  const filtered = useMemo(() => {
    const list = incidents.data?.items ?? [];
    const q = query.trim().toLowerCase();
    return list
      .filter((i) => {
        if (severities.length > 0 && !severities.includes(i.severity))
          return false;
        if (statuses.length > 0 && !statuses.includes(i.status)) return false;
        if (q) {
          const hay =
            `${i.id} ${i.title} ${serviceName(i.serviceId)} ${i.assignee}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }, [incidents.data?.items, query, severities, statuses, serviceName]);

  if (incidents.isLoading) return <LoadingBlock />;
  if (incidents.isError) {
    return (
      <ErrorState
        detail={incidents.error?.message}
        onRetry={() => incidents.refetch()}
      />
    );
  }

  const totalIncidents = incidents.data?.total ?? 0;
  const totalPages = Math.ceil(totalIncidents / 50) || 1;

  const toggle = <T,>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    value: T,
  ) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1); // Reset to first page when searching
            }}
            placeholder="Search ID, title, service, assignee…"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">Severity</span>
          {ALL_SEVERITIES.map((sev) => (
            <ToggleChip
              key={sev}
              active={severities.includes(sev)}
              onClick={() => {
                toggle(setSeverities, sev);
                setPage(1); // Reset to first page when filtering
              }}
              label={sev}
              className="font-mono"
            />
          ))}
          <span className="text-muted-foreground ml-2 text-xs">Status</span>
          {ALL_STATUSES.map((st) => (
            <ToggleChip
              key={st}
              active={statuses.includes(st)}
              onClick={() => {
                toggle(setStatuses, st);
                setPage(1); // Reset to first page when filtering
              }}
              label={st}
            />
          ))}
          {/* WebSocket connection status indicator */}
          <span
            className={cn(
              "flex items-center gap-1 text-xs px-2 py-1 rounded border",
              wsConnected
                ? "border-success/30 bg-success/10 text-success"
                : "border-warning/30 bg-warning/10 text-warning",
            )}
          >
            {wsConnected ? (
              <>
                <span className="size-1.5 rounded-full bg-success" />
                Real-time
              </>
            ) : (
              <>
                <span className="size-1.5 rounded-full bg-warning animate-pulse" />
                Conectando...
              </>
            )}
          </span>
        </div>
      </div>

      <Card className="gap-0">
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Incident</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Started</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead>Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell>
                    <Link
                      href={`/incidents/${incident.id}`}
                      className="text-info hover:underline font-mono"
                    >
                      {incident.id}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={incident.severity} />
                  </TableCell>
                  <TableCell className="max-w-72">
                    <Link
                      href={`/incidents/${incident.id}`}
                      className="hover:text-foreground/90 text-left font-medium hover:underline"
                    >
                      {incident.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">
                      {serviceName(incident.serviceId)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={incident.status} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {formatTime(incident.startedAt)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {formatDuration(incident.startedAt, incident.resolvedAt)}
                  </TableCell>
                  <TableCell className="text-sm">{incident.assignee}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 ? (
            <EmptyState
              title="No incidents match"
              detail="Adjust the search or filters."
            />
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          Showing {filtered.length} of {totalIncidents} incidents (page {page}{" "}
          of {totalPages})
        </p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" /> New incident
        </Button>
      </div>

      <Pagination
        page={page}
        pageCount={totalPages}
        onPageChange={setPage}
        showFirstLast
      />

      <NewIncidentDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  label,
  className,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hover:bg-accent/70 rounded-md border px-2 py-1 text-xs transition-colors",
        active
          ? "border-foreground/40 bg-accent text-foreground"
          : "border-border/70 text-muted-foreground",
        className,
      )}
    >
      {label}
    </button>
  );
}
