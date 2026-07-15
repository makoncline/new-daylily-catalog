// @vitest-environment node
import { expect, it, vi } from "vitest";
import { terminateAtlasServer } from "../scripts/atlas-server-process.mjs";

it("terminates the server process group after its leader exits", () => {
  const signal = vi.fn();

  terminateAtlasServer(
    { exitCode: 1, pid: 4242 },
    { platform: "darwin", signal },
  );

  expect(signal).toHaveBeenCalledWith(-4242, "SIGTERM");
});
