"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { Incident } from "@rootline/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@rootline/ui";

import { useMutationIncident } from "@/features/incidents/use-incidents";

export function ResolveDialog({
  incident,
  open,
  onOpenChange,
}: {
  incident: Incident;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useMutationIncident(incident.id);

  const [rootCause, setRootCause] = React.useState(incident.resolution?.rootCause ?? "");
  const [summary, setSummary] = React.useState(incident.resolution?.summary ?? "");
  const [mitigation, setMitigation] = React.useState(incident.resolution?.mitigation ?? "");
  const [resolvedBy, setResolvedBy] = React.useState(incident.assignee);

  React.useEffect(() => {
    if (open) {
      setRootCause(incident.resolution?.rootCause ?? "");
      setSummary(incident.resolution?.summary ?? "");
      setMitigation(incident.resolution?.mitigation ?? "");
      setResolvedBy(incident.assignee);
    }
  }, [open, incident]);

  const canSubmit = rootCause.trim().length > 0 && summary.trim().length > 0;

  const submit = () => {
    mutation.mutate(
      {
        status: "RESOLVED",
        resolution: {
          rootCause: rootCause.trim(),
          summary: summary.trim(),
          mitigation: mitigation.trim(),
          resolvedBy: resolvedBy.trim() || incident.assignee,
        },
      },
      {
        onSuccess: () => {
          toast.success(`${incident.id} resolved`, {
            description: "Resolution registered. The incident moved to RESOLVED.",
          });
          onOpenChange(false);
        },
        onError: (error) => toast.error("Failed to resolve incident", { description: error.message }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="text-success size-5" />
            Resolve {incident.id}
          </DialogTitle>
          <DialogDescription>
            Confirm the root cause and register the resolution. This records the
            incident outcome and moves it to RESOLVED.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rc-root-cause">Root cause</Label>
            <Input
              id="rc-root-cause"
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="e.g. Connection pool exhaustion after deployment v2.8.1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rc-summary">Resolution summary</Label>
            <Textarea
              id="rc-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe the fix applied and the outcome."
              className="min-h-20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rc-mitigation">Mitigation</Label>
            <Textarea
              id="rc-mitigation"
              value={mitigation}
              onChange={(e) => setMitigation(e.target.value)}
              placeholder="Short-term actions taken (rollback, scaling, cache warm, …)."
              className="min-h-16"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rc-by">Resolved by</Label>
            <Input
              id="rc-by"
              value={resolvedBy}
              onChange={(e) => setResolvedBy(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Confirm resolution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}