if (process.argv.includes("--exit-early")) {
  await new Promise((resolve) => {
    process.stderr.write("Intentional early target exit.\n", () =>
      resolve(undefined),
    );
  });
  process.exit(19);
}

const messages = [];
let sourceResult;
let buffered = "";
process.stdin.setEncoding("utf8");

for await (const chunk of process.stdin) {
  buffered += chunk;
  let lineEnd = buffered.indexOf("\n");

  while (lineEnd >= 0) {
    const line = buffered.slice(0, lineEnd);
    buffered = buffered.slice(lineEnd + 1);
    lineEnd = buffered.indexOf("\n");
    if (!line.trim()) continue;

    const message = JSON.parse(line);
    if (message.type === "complete") {
      sourceResult = message.sourceResult;
    } else {
      messages.push(message);
    }
  }
}

if (buffered.trim()) throw new Error("Input ended without a line delimiter.");
if (sourceResult === undefined) {
  throw new Error("Completion message is missing.");
}

if (process.argv.includes("--fail")) {
  throw new Error("Intentional target failure.");
}

process.stdout.write("target worker log\n");
process.stdout.write(
  `${JSON.stringify({
    args: process.argv.slice(2),
    leakedSecret: process.env.TARGET_WORKER_SECRET_TEST ?? null,
    messages,
    sourceResult,
  })}\n`,
);
