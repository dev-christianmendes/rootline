"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Rocket,
  Search,
  Server,
  UserRound,
  Video,
  Zap,
} from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from "@rootline/ui";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/incidents", label: "Incidents", icon: Zap },
  { href: "/services", label: "Services", icon: Server },
  { href: "/investigations", label: "Investigations", icon: FlaskConical },
  { href: "/deployments", label: "Deployments", icon: Rocket },
];

const NOTIFICATIONS = [
  {
    id: "n1",
    kind: "incident",
    title: "INC-2391 escalated to P1",
    detail: "Payment API HTTP 500 spike",
    time: "14:08",
  },
  { id: "n2", kind: "correlation", title: "Correlation detected", detail: "v2.8.1 deployment ↔ error rate", time: "14:10" },
  { id: "n3", kind: "hypothesis", title: "AI hypothesis ready", detail: "payment-api deployment · 82%", time: "14:11" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-background/85 sticky top-0 z-40 border-b border-border/70 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-4 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="bg-info/15 text-info flex size-7 shrink-0 items-center justify-center rounded-md border border-info/20">
              <Activity className="size-4" />
            </span>
            <span className="font-mono text-sm font-semibold tracking-wide">
              ROOTLINE
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-0.5 md:flex">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden lg:block">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search services, incidents…"
                className="h-8 w-64 pl-8"
                aria-label="Search"
              />
              <kbd className="bg-muted text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[10px]">
                ⌘K
              </kbd>
            </div>

            <NotificationsMenu />
            <UserMenu />
          </div>
        </div>

        <nav className="flex items-center gap-0.5 overflow-x-auto border-t border-border/50 px-4 py-1.5 md:hidden">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                  active ? "bg-accent" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-6">
        {children}
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-4 md:px-6">
          <p className="text-muted-foreground font-mono text-xs">
            ROOTLINE · from incident to root cause
          </p>
          <p className="text-muted-foreground font-mono text-xs">
            AI doesn&apos;t guess. It investigates.
          </p>
        </div>
      </footer>
    </div>
  );
}

function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
          <span className="bg-destructive absolute top-2 right-2 size-1.5 rounded-full" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2">
          Notifications
          <Badge variant="critical" className="ml-auto">
            3 new
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {NOTIFICATIONS.map((n) => (
          <DropdownMenuItem key={n.id} className="flex items-start gap-2.5 py-2">
            <div className="mt-0.5 flex flex-col">
              <span className="text-sm font-medium">{n.title}</span>
              <span className="text-muted-foreground text-xs">{n.detail}</span>
            </div>
            <span className="text-muted-foreground ml-auto font-mono text-xs">{n.time}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <span className="bg-secondary text-foreground flex size-7 items-center justify-center rounded-full border border-border font-mono text-xs">
            LC
            <span className="sr-only">L. Chen</span>
          </span>
          <span className="hidden text-sm font-medium xl:inline">L. Chen</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">L. Chen</span>
            <span className="font-mono text-xs text-info">ENGINEER</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserRound /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Video /> Join incident channel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function HealthChip({ label, value }: { label: string; value: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="bg-muted text-muted-foreground flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-xs">
          <span className="bg-success size-1.5 rounded-full" />
          {label}: {value}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        System health {label} is currently {value}.
      </TooltipContent>
    </Tooltip>
  );
}