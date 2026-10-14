import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createClient } from "@libsql/client";

// Forward real database traffic. Drop only the response to a completed COMMIT.
export async function startIntegrationLibsql(databasePath, port) {
  const directory = `${databasePath}.sqld`;
  const namespace = path.join(directory, "dbs", "default");
  fs.mkdirSync(namespace, { recursive: true });
  fs.copyFileSync(databasePath, path.join(namespace, "data"));
  const log = fs.openSync(`${directory}/server.log`, "w");
  const child = spawn(
    process.env.SQLD_BINARY ?? "sqld",
    [
      "--db-path",
      directory,
      "--http-listen-addr",
      `127.0.0.1:${port + 1}`,
      "--http-self-url",
      `http://127.0.0.1:${port}`,
    ],
    { stdio: ["ignore", log, log] },
  );
  fs.closeSync(log);
  let startError;
  child.on("error", (error) => {
    startError = error;
  });
  const upstream = `http://127.0.0.1:${port + 1}`;
  const client = createClient({ url: upstream });
  let dropCommit = false;
  let dropped = 0;
  const proxy = http.createServer(async (request, response) => {
    if (request.url === "/__drop-commit" && request.method === "POST") {
      dropCommit = true;
      response.end("armed");
      return;
    }
    if (request.url === "/__fault-state") {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ dropped }));
      return;
    }
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const discard = dropCommit && body.includes(Buffer.from("COMMIT"));
    if (discard) dropCommit = false;
    const forwarded = http.request(
      new URL(request.url, upstream),
      {
        method: request.method,
        headers: request.headers,
      },
      (result) => {
        if (discard) {
          result.resume();
          result.on("end", () => {
            if (result.statusCode === 200) dropped += 1;
            response.destroy();
          });
        } else {
          response.writeHead(result.statusCode, result.headers);
          result.pipe(response);
        }
      },
    );
    forwarded.on("error", () => response.destroy());
    forwarded.end(body);
  });
  const close = async () => {
    proxy.closeAllConnections();
    if (proxy.listening) await new Promise((resolve) => proxy.close(resolve));
    client.close();
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGKILL");
      await exited;
    }
    fs.rmSync(directory, { recursive: true, force: true });
  };
  try {
    const deadline = Date.now() + 15_000;
    for (;;) {
      if (startError) throw startError;
      if (child.exitCode !== null)
        throw new Error(fs.readFileSync(`${directory}/server.log`, "utf8"));
      try {
        await client.execute("SELECT 1");
        break;
      } catch (error) {
        if (Date.now() >= deadline) throw error;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    proxy.listen(port, "127.0.0.1");
    await once(proxy, "listening");
    return { url: `libsql://127.0.0.1:${port}?tls=0`, close };
  } catch (error) {
    await close();
    throw error;
  }
}
