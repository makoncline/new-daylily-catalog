export async function runRollingWorkerPool({
  backlogRefillSize,
  claimItem,
  getClaimableIds,
  getPendingCount,
  initialConcurrency,
  limit,
  log,
  onStateChange,
  processItem,
  queueSourceRows,
  specificId,
  takeControlCommand,
  terminateChild,
  terminateRunningChildren,
}) {
  const activeTasks = new Set();
  const attemptedIds = new Set();
  let desiredConcurrency = initialConcurrency;
  let draining = false;
  let forceStopping = false;
  let stopSignal = null;
  let stopReason = null;
  let catchupStarted = Boolean(specificId);
  let catchupComplete = Boolean(specificId);
  let backlogExhausted = false;
  let refillChild = null;
  let refillMode = null;
  let refillPromise = null;
  let refillCheckNeeded = true;
  let fatalError = null;

  const getState = () => ({
    active: activeTasks.size,
    attempted: attemptedIds.size,
    desiredConcurrency,
    draining,
    forceStopping,
    refillMode,
    stopReason,
    stopSignal,
  });
  const publishState = () => onStateChange(getState());

  const requestDrain = (reason) => {
    if (draining) return;
    draining = true;
    stopReason = reason;
    log(`draining reason=${reason} active=${activeTasks.size}`);
    if (refillChild) terminateChild(refillChild);
    publishState();
  };

  const forceStop = (signal) => {
    if (forceStopping) return;
    forceStopping = true;
    draining = true;
    stopSignal = signal;
    stopReason ??= signal;
    log(`force stopping signal=${signal} active=${activeTasks.size}`);
    if (refillChild) terminateChild(refillChild);
    terminateRunningChildren(signal);
    publishState();
  };

  const handleSignal = (signal) => {
    if (draining) {
      forceStop(signal);
      return;
    }
    requestDrain(signal);
  };
  const handleSigint = () => handleSignal("SIGINT");
  const handleSigterm = () => handleSignal("SIGTERM");
  process.on("SIGINT", handleSigint);
  process.on("SIGTERM", handleSigterm);

  const startAvailable = () => {
    if (draining || attemptedIds.size >= limit) return;

    const slots = Math.min(
      desiredConcurrency - activeTasks.size,
      limit - attemptedIds.size,
    );
    if (slots <= 0) return;

    const ids = getClaimableIds(slots);
    let claimed = 0;
    for (const id of ids) {
      const item = claimItem(id);
      if (!item) {
        log(`skipped id=${id} reason=not-claimable`);
        continue;
      }

      attemptedIds.add(id);
      claimed += 1;
      let task;
      task = processItem(item, getState).finally(() => {
        activeTasks.delete(task);
        refillCheckNeeded = true;
        publishState();
      });
      activeTasks.add(task);
    }

    if (claimed > 0) refillCheckNeeded = true;
    publishState();
  };

  const beginRefill = (mode, refillLimit) => {
    if (refillPromise || draining || refillLimit < 1) return;
    refillMode = mode;
    if (mode === "catchup") catchupStarted = true;
    publishState();

    refillPromise = queueSourceRows(mode, refillLimit, (child) => {
      refillChild = child;
    })
      .then((output) => {
        if (mode === "catchup") catchupComplete = true;
        if (mode === "backlog" && /\bselected=0\b/.test(output)) {
          backlogExhausted = true;
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        if (draining) {
          log(`queue refill interrupted mode=${mode}`);
          return;
        }

        fatalError = error;
        process.exitCode = 1;
        log(`${mode} refill stopped error=${message}`);
        requestDrain(`${mode} refill failed`);
      })
      .finally(() => {
        refillChild = null;
        refillMode = null;
        refillPromise = null;
        refillCheckNeeded = true;
        publishState();
      });
  };

  const maybeRefill = () => {
    if (specificId || draining || refillPromise || !refillCheckNeeded) return;
    refillCheckNeeded = false;

    const remaining = limit - attemptedIds.size;
    if (remaining <= 0) return;
    if (!catchupStarted) {
      beginRefill("catchup", remaining);
      return;
    }
    if (!catchupComplete || backlogExhausted) return;

    const pending = getPendingCount();
    const lowWater = Math.min(remaining, desiredConcurrency * 2);
    if (pending >= lowWater) return;
    const refillSize = Math.min(
      remaining - pending,
      Math.max(backlogRefillSize, desiredConcurrency * 3),
    );
    beginRefill("backlog", refillSize);
  };

  const applyControlCommand = () => {
    const command = takeControlCommand();
    if (!command) return;

    if (command.command === "drain") {
      requestDrain("control command");
      return;
    }
    if (
      command.command === "concurrency" &&
      Number.isInteger(command.value) &&
      command.value > 0
    ) {
      const previous = desiredConcurrency;
      desiredConcurrency = command.value;
      refillCheckNeeded = true;
      log(
        `concurrency changed previous=${previous} desired=${desiredConcurrency} active=${activeTasks.size}`,
      );
      publishState();
      return;
    }
    log(`control command ignored reason=invalid command=${command.command}`);
  };

  const waitForActivity = async () => {
    const waits = [new Promise((resolve) => setTimeout(resolve, 250))];
    waits.push(...activeTasks);
    if (refillPromise) waits.push(refillPromise);
    await Promise.race(waits);
  };

  publishState();
  try {
    while (true) {
      applyControlCommand();
      startAvailable();
      maybeRefill();

      if (!draining && attemptedIds.size >= limit) {
        requestDrain("limit reached");
      }
      if (
        !draining &&
        specificId &&
        attemptedIds.size === 0 &&
        activeTasks.size === 0
      ) {
        requestDrain("queue item is not claimable");
      }
      if (
        !draining &&
        backlogExhausted &&
        !refillPromise &&
        activeTasks.size === 0 &&
        getClaimableIds(1).length === 0
      ) {
        requestDrain("source backlog exhausted");
      }
      if (draining && activeTasks.size === 0 && !refillPromise) break;
      if (fatalError && activeTasks.size === 0 && !refillPromise) break;

      await waitForActivity();
    }
  } finally {
    process.removeListener("SIGINT", handleSigint);
    process.removeListener("SIGTERM", handleSigterm);
  }

  return getState();
}
