"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Incident, Severity } from "@rootline/types";
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
  cn,
} from "@rootline/ui";

import { useCreateIncident } from "@/features/incidents/use-incidents";
import { useServices } from "@/features/services/use-services";

const SEVERITIES: Severity[] = ["P1", "P2", "P3", "P4"];

const fieldClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]";

export function NewIncidentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const services = useServices();
  const create = useCreateIncident();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [severity, setSeverity] = React.useState<Severity>("P3");
  const [serviceId, setServiceId] = React.useState("");
  const [assignee, setAssignee] = React.useState("");
  const [impact, setImpact] = React.useState("");

  const reset = React.useCallback(() => {
    setTitle("");
    setDescription("");
    setSeverity("P3");
    setServiceId("");
    setAssignee("");
    setImpact("");
  }, []);

  React.useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  // Default to the first service once the list arrives.
  React.useEffect(() => {
    if (!serviceId && services.data?.length) {
      setServiceId(services.data[0]!.id);
    }
  }, [services.data, serviceId]);

  const submit = () => {
    if (title.trim().length === 0) return;
    create.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        severity,
        serviceId: serviceId || undefined,
        assignee: assignee.trim() || undefined,
        impact: impact.trim() || undefined,
      },
      {
        onSuccess: (incident: Incident) => {
          toast.success(`${incident.id} created`, {
            description:
              "The incident is now DETECTED and listed in the incident center.",
          });
          onOpenChange(false);
          router.push(`/incidents/${incident.id}`);
        },
        onError: (error: Error) =>
          toast.error("Failed to create incident", {
            description: error.message,
          }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="text-info size-5" />
            New incident
          </DialogTitle>
          <DialogDescription>
            Opens a DETECTED incident so the correlation engine has a timeline
            to investigate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ni-title">Title</Label>
            <Input
              id="ni-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Checkout API returning HTTP 502"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ni-description">Description</Label>
            <Textarea
              id="ni-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is failing, and since when?"
              className="min-h-20"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ni-severity">Severity</Label>
              <select
                id="ni-severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className={cn(fieldClass, "appearance-none")}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ni-service">Service</Label>
              <select
                id="ni-service"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                disabled={services.isLoading}
                className={cn(fieldClass, "appearance-none")}
              >
                {(services.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ni-assignee">Assignee</Label>
            <Input
              id="ni-assignee"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Leave empty to mark as unassigned"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ni-impact">Impact</Label>
            <Input
              id="ni-impact"
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              placeholder="Who or what is affected, and how badly?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={title.trim().length === 0 || create.isPending}
          >
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create incident
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
