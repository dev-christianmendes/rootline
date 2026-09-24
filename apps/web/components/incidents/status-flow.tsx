"use client";

import type { IncidentStatus } from "@rootline/types";
import { cn } from "@rootline/ui";

import { STATUS_FLOW, STATUS_META } from "@/lib/format";

export function StatusFlow({ status }: { status: IncidentStatus }) {
  const current = STATUS_FLOW.indexOf(status);

  return (
    <div className="flex w-full items-center" aria-label={`Status: ${status}`}>
      {STATUS_FLOW.map((step, i) => {
        const meta = STATUS_META[step];
        const reached = i <= current;
        const isCurrent = i === current;
        return (
          <div key={step} className={cn("flex items-center", i < STATUS_FLOW.length - 1 && "flex-1")}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-2.5 items-center justify-center rounded-full border transition-colors",
                  reached ? meta.dot + " border-transparent" : "bg-muted border-border",
                  isCurrent && "ring-4 ring-ring/15",
                )}
              />
              <span
                className={cn(
                  "font-mono text-[10px] tracking-wide",
                  reached ? "text-foreground" : "text-muted-foreground/60",
                )}
              >
                {step.slice(0, 8)}
              </span>
            </div>
            {i < STATUS_FLOW.length - 1 ? (
              <div className={cn("mx-1.5 mb-5 h-px flex-1", i < current ? "bg-foreground/30" : "bg-border")} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}