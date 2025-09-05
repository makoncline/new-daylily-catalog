"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";
import {
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  setContext,
  setTag,
  withSpan,
} from "@/lib/sentry";

export default function Page() {
  const [logs, setLogs] = useState<Array<{ type: string; message: string }>>(
    [],
  );

  const logAction = (type: string, message: string) => {
    setLogs((prev) => [...prev, { type, message }]);
    console.log(`[${type}] ${message}`);
  };

  const testCaptureException = () => {
    try {
      throw new Error("Test exception from utility");
    } catch (error) {
      captureException(error);
      logAction("captureException", "Test exception captured");
    }
  };

  const testCaptureMessage = () => {
    captureMessage("This is a test message", "info");
    logAction("captureMessage", "Test message sent with 'info' level");
  };

  const testSetUser = () => {
    setUser({ id: "test-user-123", email: "test@example.com" });
    logAction("setUser", "Set user with ID test-user-123");
  };

  const testClearUser = () => {
    clearUser();
    logAction("clearUser", "User information cleared");
  };

  const testBreadcrumb = () => {
    addBreadcrumb({
      category: "test",
      message: "User clicked test button",
      level: "info",
    });
    logAction("addBreadcrumb", "Added user action breadcrumb");
  };

  const testSetContext = () => {
    setContext("test-context", {
      feature: "sentry-test",
      component: "example-page",
    });
    logAction("setContext", "Added test context data");
  };

  const testSetTag = () => {
    setTag("test-tag", "example-value");
    logAction("setTag", "Set test tag");
  };

  const testWithSpan = async () => {
    logAction("withSpan", "Starting performance span...");
    await withSpan("test-operation", "test", async () => {
      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 500));
      logAction("withSpan", "Operation completed within span");
    });
  };

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-6 text-3xl font-bold">Sentry Testing Page</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="mb-4 text-xl font-semibold">Original Sentry Tests</h2>
          <button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 mb-4 rounded px-4 py-2"
            onClick={async () => {
              await Sentry.startSpan(
                {
                  name: "Example Frontend Span",
                  op: "test",
                },
                async () => {
                  const res = await fetch("/api/sentry-example-api");
                  if (!res.ok) {
                    throw new Error("Sentry Example Frontend Error");
                  }
                },
              );
            }}
          >
            Throw API Error
          </button>

          <p className="text-sm">
            Check errors on the{" "}
            <a
              href="https://makon-dev.sentry.io/issues/?project=4508939597643776"
              className="text-primary underline"
            >
              Sentry Issues Page
            </a>
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-4 text-xl font-semibold">Utility Function Tests</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1.5 text-sm"
              onClick={testCaptureException}
            >
              Test Exception
            </button>
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1.5 text-sm"
              onClick={testCaptureMessage}
            >
              Test Message
            </button>
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1.5 text-sm"
              onClick={testSetUser}
            >
              Set User
            </button>
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1.5 text-sm"
              onClick={testClearUser}
            >
              Clear User
            </button>
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1.5 text-sm"
              onClick={testBreadcrumb}
            >
              Add Breadcrumb
            </button>
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1.5 text-sm"
              onClick={testSetContext}
            >
              Set Context
            </button>
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1.5 text-sm"
              onClick={testSetTag}
            >
              Set Tag
            </button>
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1.5 text-sm"
              onClick={testWithSpan}
            >
              Test Span
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-4">
        <h2 className="mb-2 text-xl font-semibold">Action Logs</h2>
        <div className="bg-foreground text-background h-48 overflow-y-auto rounded p-3 font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-muted-foreground">
              Click buttons above to test Sentry functionality...
            </p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                <span className="text-primary">[{log.type}]</span> {log.message}
              </div>
            ))
          )}
        </div>
        <div className="mt-2 text-right">
          <button
            className="bg-muted text-foreground rounded px-2 py-1 text-sm"
            onClick={() => setLogs([])}
          >
            Clear Logs
          </button>
        </div>
      </div>

      <div className="text-muted-foreground mt-6 text-sm">
        <p>
          When Sentry is disabled (NEXT_PUBLIC_SENTRY_ENABLED=false), actions
          will log to console but not to Sentry. Check your browser console to
          see fallback logs.
        </p>
      </div>
    </div>
  );
}
