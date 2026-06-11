import type { db } from "@/server/db";

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  securitySchemes: Array<
    { type: "noauth" } | { type: "oauth2"; scopes: string[] }
  >;
  annotations?: {
    readOnlyHint?: boolean;
    openWorldHint?: boolean;
    destructiveHint?: boolean;
  };
  _meta?: Record<string, unknown>;
}

export interface McpContext {
  baseUrl: string;
  request: Request;
  readDb: typeof db;
}
