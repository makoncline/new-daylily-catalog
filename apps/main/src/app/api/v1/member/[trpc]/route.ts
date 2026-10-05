import {
  handleMemberHttpRequest,
  memberHttpOptions,
} from "@/server/api/member-http";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ trpc: string }> };

async function handler(request: Request, context: RouteContext) {
  const { trpc } = await context.params;
  return handleMemberHttpRequest(request, trpc);
}

export { handler as GET, handler as POST };
export { memberHttpOptions as OPTIONS };
