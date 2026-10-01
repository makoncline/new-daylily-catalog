export interface WebMcpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
  annotations?: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    openWorldHint: boolean;
    idempotentHint?: boolean;
    untrustedContentHint?: boolean;
  };
}

interface WebMcpModelContext {
  registerTool: (
    tool: WebMcpTool,
    options: { signal: AbortSignal },
  ) => Promise<void>;
}

export async function registerWebMcpTools(
  tools: WebMcpTool[],
  signal: AbortSignal,
) {
  const context = (
    document as Document & {
      modelContext?: WebMcpModelContext;
    }
  ).modelContext;
  if (!context?.registerTool) return;

  for (const tool of tools) {
    if (signal.aborted) return;
    try {
      await context.registerTool(tool, { signal });
    } catch (error) {
      void error;
    }
  }
}

export function toolResult(payload: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}
