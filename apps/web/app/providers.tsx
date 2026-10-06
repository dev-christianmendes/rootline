"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@rootline/ui";
import { Toaster } from "sonner";
import { WebSocketProvider } from "@/context/websocket-context";
import { LocaleProvider } from "@/context/locale-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={200}>
        <LocaleProvider>
          <WebSocketProvider>{children}</WebSocketProvider>
        </LocaleProvider>
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
