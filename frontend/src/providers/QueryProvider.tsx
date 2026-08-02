"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { ERROR_CODES } from "@homematch/shared";

/**
 * Server state for the authenticated app.
 *
 * Scoped to the shell rather than the root layout: the landing page and auth
 * screens have no server state, and a provider around them would ship the
 * client to visitors who never authenticate.
 *
 * `useState` rather than a module-level client — on the server a shared client
 * would leak one request's cache into another's.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            /**
             * Retrying a 401 is pointless — `lib/api.ts` has already tried a
             * silent refresh and failed, so the session is genuinely over.
             * Retrying a 403 or 404 is worse: it asks three times for something
             * the server will never grant.
             */
            retry: (failureCount, error) => {
              if (error instanceof ApiError) {
                const terminal: string[] = [
                  ERROR_CODES.UNAUTHORIZED,
                  ERROR_CODES.FORBIDDEN,
                  ERROR_CODES.NOT_FOUND,
                  ERROR_CODES.VALIDATION_ERROR,
                ];
                if (terminal.includes(error.code)) return false;
              }
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
