import {
  handleMemberHttpRequest,
  memberHttpOptions,
} from "@/server/api/member-http";

import { withUsageRequest } from "@/server/observability/api-usage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ trpc: string }> };

async function handler(request: Request, context: RouteContext) {
  const { trpc } = await context.params;
  return withUsageRequest(request, "member_api", () =>
    handleMemberHttpRequest(request, trpc),
  );
}

export { handler as GET, handler as POST };
export { memberHttpOptions as OPTIONS };
