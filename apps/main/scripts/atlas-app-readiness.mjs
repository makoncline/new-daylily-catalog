import { createConnection } from "node:net";

const appReadPath =
  "/api/trpc/public.getPublicProfiles?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D";

/** @param {string} baseURL */
export async function assertAtlasAppReady(baseURL) {
  const response = await fetch(new URL(appReadPath, baseURL), {
    redirect: "error",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok)
    throw new Error(`Public profile read returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (
    !Array.isArray(payload) ||
    payload.length !== 1 ||
    payload[0]?.error ||
    !Array.isArray(payload[0]?.result?.data?.json)
  )
    throw new Error(
      "Public profile read did not return a successful catalog payload.",
    );
}

/** @param {string} baseURL */
export async function assertAtlasPortAvailable(baseURL) {
  const url = new URL(baseURL);
  await new Promise((resolve, reject) => {
    const socket = createConnection({
      host: url.hostname,
      port: Number(url.port),
    });
    socket.setTimeout(2_000);
    socket.once("connect", () => {
      socket.destroy();
      reject(
        new Error(
          `${baseURL} is already in use. Choose a free ATLAS_PORT or pass BASE_URL explicitly to reuse an app.`,
        ),
      );
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error(`Cannot check the Atlas port at ${baseURL}.`));
    });
    socket.once("error", (error) => {
      socket.destroy();
      if ("code" in error && error.code === "ECONNREFUSED") resolve(undefined);
      else reject(error);
    });
  });
}
