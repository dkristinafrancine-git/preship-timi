"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReactNode } from "react";
import { _registerQueryClient } from "@/lib/use-api";
import { _registerInvalidator } from "@/lib/preship-store";

export function Providers({ children }: { children: ReactNode }) {
  // One QueryClient per browser session (client-only). Created in state so it
  // persists across re-renders but never leaks to the server bundle. Defaults
  // are tuned for an SPA shell: no aggressive refetch-on-focus/window-focus,
  // since the data is user-generated and mutations drive invalidation.
  const [queryClient] = useState(() => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          // Long staleTime: endpoints are invalidated explicitly by useMutate
          // (scoped to channel), so we don't need RQ to refetch on its own
          // timers. This keeps navigation back to a cached view instant.
          staleTime: 5 * 60 * 1000,
          gcTime: 30 * 60 * 1000,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: "always",
          retry: 1,
        },
      },
    });
    // Register so the module-level prefetchApi / invalidateCacheEntry helpers
    // (used outside React components, e.g. in event handlers) can reach it.
    _registerQueryClient(qc);
    // Register a global invalidator so the zustand store's `bump()` (called by
    // auth flows for a login/logout refetch) routes into React Query.
    _registerInvalidator(() => {
      void qc.invalidateQueries();
    });
    return qc;
  });

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {/* Single TooltipProvider high in the tree — every <FoundingBadge />
            (and any future tooltip) can render without per-call wrapping. */}
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
