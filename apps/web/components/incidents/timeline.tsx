import {
  CheckCircle2,
  FlaskConical,
  Gauge,
  Rocket,
  Server,
  UserRound,
  Zap,
} from "lucide-react";

import type { TimelineEvent, TimelineEventType } from "@rootline/types";
import { cn } from "@rootline/ui";

import { formatTime } from "@/lib/format";

const TYPE_META: Record<
  TimelineEventType,
  { icon: typeof Rocket; dot: string; chip: string }
> = {
  deployment: { icon: Rocket, dot: "bg-info", chip: "text-info border-info/25 bg-info/10" },
  metric: { icon: Gauge, dot: "bg-warning", chip: "text-warning border-warning/25 bg-warning/10" },
  incident: { icon: Zap, dot: "bg-critical", chip: "text-critical border-critical/25 bg-critical/10" },
  investigation: { icon: FlaskConical, dot: "bg-info", chip: "text-info border-info/25 bg-info/10" },
  action: { icon: UserRound, dot: "bg-foreground/70", chip: "text-foreground/80 border-border bg-card/50" },
  system: { icon: Server, dot: "bg-muted-foreground", chip: "text-muted-foreground border-border bg-card/50" },
  resolution: { icon: CheckCircle2, dot: "bg-success", chip: "text-success border-success/25 bg-success/10" },
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">No timeline events.</p>;
  }

  return (
    <ol className="relative ml-2 space-y-5 border-l border-border/60 pl-5">
      {events.map((event, i) => {
        const meta = TYPE_META[event.type];
        const Icon = meta.icon;
        return (
          <li key={`${event.time}-${i}`} className="relative">
            <span
              className={cn(
                "absolute top-1 -left-[26.5px] flex size-5 items-center justify-center",
              )}
            >
              <span className={cn("size-2.5 rounded-full ring-4 ring-background", meta.dot)} />
            </span>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {formatTime(event.time)}
                </span>
                <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-medium", meta.chip)}>
                  {event.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Icon className="text-foreground size-3.5 shrink-0" />
                <span className="text-sm font-medium">{event.title}</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {event.detail}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}