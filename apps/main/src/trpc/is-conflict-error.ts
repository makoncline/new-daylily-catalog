import { isTRPCClientError } from "@trpc/client";
import type { AppRouter } from "@/server/api/root";

export function isConflictError(error: unknown): boolean {
  return isTRPCClientError<AppRouter>(error) && error.data?.code === "CONFLICT";
}
