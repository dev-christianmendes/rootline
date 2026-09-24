import * as React from "react";
import { Inbox, TriangleAlert } from "lucide-react";

import { Button, Skeleton, cn } from "@rootline/ui";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-muted-foreground text-xs font-semibold tracking-widest uppercase",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function LoadingBlock({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-3", className)}>
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function ErrorState({
  title = "Unable to load data",
  detail,
  onRetry,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-border/60 bg-card/40 p-8 text-center">
      <TriangleAlert className="text-warning size-6" />
      <p className="text-sm font-medium">{title}</p>
      {detail ? <p className="text-muted-foreground max-w-md text-xs">{detail}</p> : null}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title = "Nothing here",
  detail,
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 p-8 text-center">
      <Inbox className="text-muted-foreground size-5" />
      <p className="text-sm font-medium">{title}</p>
      {detail ? <p className="text-muted-foreground text-xs">{detail}</p> : null}
    </div>
  );
}