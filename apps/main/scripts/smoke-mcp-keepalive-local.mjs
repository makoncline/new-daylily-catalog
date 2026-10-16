// Run against a built app image: node scripts/smoke-mcp-keepalive-local.mjs <image>
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const image = process.argv[2];
if (!image) throw new Error("Pass the locally built app image to test.");
const name = `daylily-mcp-${randomUUID().slice(0, 8)}`;
const app = `${name}-app`;
const proxy = `${name}-proxy`;
const directory = mkdtempSync(path.join(tmpdir(), `${name}-`));
const docker = (...args) =>
  execFileSync("docker", args, { encoding: "utf8", timeout: 60_000 });

try {
  docker("network", "create", "--internal", name);
  docker(
    "run",
    "-d",
    "--name",
    app,
    "--network",
    name,
    "--network-alias",
    "app",
    "--platform",
    "linux/amd64",
    "-e",
    "APP_BASE_URL=http://localhost:3000",
    "-e",
    "DATABASE_URL=file:/tmp/unused.sqlite",
    "-e",
    "SKIP_ENV_VALIDATION=1",
    "-e",
    "NEXT_PUBLIC_SENTRY_ENABLED=false",
    "-e",
    "NEXT_PUBLIC_POSTHOG_KEY=",
    image,
  );
  // Delay real TCP traffic so an idle close can cross the next POST in flight.
  docker(
    "exec",
    "-d",
    app,
    "node",
    "--input-type=module",
    "-e",
    `
    import net from 'node:net';
    net.createServer(client => {
      const server = net.connect(3000, '127.0.0.1');
      server.on('data', data => setTimeout(() => client.write(data), 500));
      client.on('data', data => setTimeout(() => server.write(data), 500));
      server.on('end', () => setTimeout(() => client.end(), 500));
      client.on('end', () => server.end());
      server.on('error', () => client.destroy());
      client.on('error', () => server.destroy());
    }).listen(4000, '0.0.0.0');
  `,
  );
  writeFileSync(
    path.join(directory, "Caddyfile"),
    ":80 {\n reverse_proxy app:4000\n}\n",
  );
  docker(
    "run",
    "-d",
    "--name",
    proxy,
    "--network",
    name,
    "--network-alias",
    "proxy",
    "-v",
    `${directory}/Caddyfile:/etc/caddy/Caddyfile:ro`,
    "caddy:2.11.2",
  );
  docker(
    "exec",
    app,
    "node",
    "--input-type=module",
    "-e",
    `
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetch('http://proxy/api/mcp/server', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({jsonrpc: '2.0', id: 0, method: 'ping'}),
        });
        if (response.status !== 200) throw new Error('MCP did not start');
        break;
      } catch (error) {
        if (attempt === 49) throw error;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  `,
  );
  console.log(
    docker(
      "exec",
      app,
      "node",
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    import {setTimeout} from 'node:timers/promises';
    async function ping(id) {
      const response = await fetch('http://proxy/api/mcp/server', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({jsonrpc: '2.0', id, method: 'ping'}),
      });
      assert.equal(response.status, 200, 'MCP POST must not return 502 after idle');
      assert.deepEqual(await response.json(), {jsonrpc: '2.0', id, result: {}});
      console.log('MCP ping ' + id + ': 200');
    }
    await ping(1);
    await setTimeout(5750);
    await ping(2);
  `,
    ),
  );
} finally {
  for (const container of [proxy, app]) {
    try {
      docker("rm", "-f", container);
    } catch {
      /* Setup can fail before creation. */
    }
  }
  try {
    docker("network", "rm", name);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
