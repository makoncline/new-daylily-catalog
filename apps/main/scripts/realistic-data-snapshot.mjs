import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { backup, DatabaseSync } from "node:sqlite";

/** @param {{ appRoot: string; configuredPath?: string; cwd?: string }} options */
export function resolveRealisticDataOutputPath({
  appRoot,
  configuredPath,
  cwd = process.cwd(),
}) {
  const outputPath = configuredPath
    ? path.resolve(cwd, configuredPath)
    : path.join(appRoot, "local", "realistic-data", "realistic-data.sqlite");
  const allowedRoot = `${path.resolve(appRoot, "local", "realistic-data")}${path.sep}`;
  if (!outputPath.startsWith(allowedRoot)) {
    throw new Error(
      "The realistic-data output must be stored under apps/main/local/realistic-data.",
    );
  }
  return outputPath;
}

/**
 * @typedef {object} RealisticDataPersona
 * @property {string} key
 * @property {string} sourceProfileSlug
 * @property {string} email
 * @property {string} clerkUserId
 * @property {string} stripeCustomerId
 * @property {string} subscriptionStatus
 */

/** @param {RealisticDataPersona} persona */
function assertPersona(persona) {
  if (!persona.email.includes("+clerk_test") || !persona.email.includes("@")) {
    throw new Error(
      `Realistic-data persona ${persona.key} must use a +clerk_test email address.`,
    );
  }
  if (!persona.clerkUserId || !persona.stripeCustomerId) {
    throw new Error(
      `Realistic-data persona ${persona.key} is missing its stage Clerk or Stripe identity.`,
    );
  }
}

/**
 * @param {{sourcePath: string, outputPath: string, personas: RealisticDataPersona[]}} options
 */
export async function generateRealisticDataSnapshot({
  sourcePath,
  outputPath,
  personas,
}) {
  if (path.resolve(sourcePath) === path.resolve(outputPath)) {
    throw new Error(
      "The realistic-data output must not overwrite its source database.",
    );
  }
  for (const persona of personas) assertPersona(persona);

  mkdirSync(path.dirname(outputPath), { recursive: true });
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    rmSync(`${outputPath}${suffix}`, { force: true });
  }
  const source = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    await backup(source, outputPath);
  } finally {
    source.close();
  }

  const db = new DatabaseSync(outputPath);
  const resolvedPersonas = [];
  let productionVisibleUserCount = 0;

  try {
    db.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE;");
    const productionActiveUsers = db
      .prepare(
        `
        SELECT User.id AS userId, KeyValue.value AS subscriptionValue
        FROM User
        INNER JOIN KeyValue
          ON KeyValue.key = 'stripe:customer:' || User.stripeCustomerId
        WHERE User.stripeCustomerId IS NOT NULL
      `,
      )
      .all()
      .flatMap((row) => {
        if (
          typeof row.userId !== "string" ||
          typeof row.subscriptionValue !== "string"
        ) {
          return [];
        }
        try {
          const status = JSON.parse(row.subscriptionValue).status;
          return status === "active" || status === "trialing"
            ? [{ userId: row.userId, status }]
            : [];
        } catch {
          return [];
        }
      });
    productionVisibleUserCount = productionActiveUsers.length;

    db.exec(`
      UPDATE User SET clerkUserId = NULL, stripeCustomerId = NULL;
      DELETE FROM KeyValue
      WHERE key LIKE 'clerk:user:%'
         OR key LIKE 'stripe:customer:%'
         OR key LIKE 'public-inquiry:%';
    `);

    const findUser = db.prepare(`
      SELECT User.id AS userId
      FROM User
      INNER JOIN UserProfile ON UserProfile.userId = User.id
      WHERE UserProfile.slug = ?
    `);
    const updateUser = db.prepare(`
      UPDATE User
      SET clerkUserId = ?, stripeCustomerId = ?
      WHERE id = ?
    `);
    const insertStripeCache = db.prepare(`
      INSERT INTO KeyValue (key, value, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)
    `);
    const deleteStripeCache = db.prepare("DELETE FROM KeyValue WHERE key = ?");
    const now = new Date().toISOString();

    for (const activeUser of productionActiveUsers) {
      const stripeCustomerId = `realistic_local_${activeUser.userId}`;
      db.prepare("UPDATE User SET stripeCustomerId = ? WHERE id = ?").run(
        stripeCustomerId,
        activeUser.userId,
      );
      insertStripeCache.run(
        `stripe:customer:${stripeCustomerId}`,
        JSON.stringify({ status: activeUser.status }),
        now,
        now,
      );
    }

    for (const persona of personas) {
      const match = findUser.get(persona.sourceProfileSlug);
      if (!match?.userId) {
        throw new Error(
          `No source user found for profile slug ${persona.sourceProfileSlug}.`,
        );
      }

      const existingUser = db
        .prepare("SELECT stripeCustomerId FROM User WHERE id = ?")
        .get(match.userId);
      if (typeof existingUser?.stripeCustomerId === "string") {
        deleteStripeCache.run(
          `stripe:customer:${existingUser.stripeCustomerId}`,
        );
      }
      updateUser.run(
        persona.clerkUserId,
        persona.stripeCustomerId,
        match.userId,
      );
      insertStripeCache.run(
        `stripe:customer:${persona.stripeCustomerId}`,
        JSON.stringify({ status: persona.subscriptionStatus }),
        now,
        now,
      );
      resolvedPersonas.push({ ...persona, userId: match.userId });
    }

    db.exec("COMMIT;");
  } catch (error) {
    try {
      db.exec("ROLLBACK;");
    } catch {
      // The transaction may not have started if the database was invalid.
    }
    db.close();
    rmSync(outputPath, { force: true });
    throw error;
  }

  const userCount = db
    .prepare("SELECT COUNT(*) AS count FROM User")
    .get()?.count;
  const listingCount = db
    .prepare("SELECT COUNT(*) AS count FROM Listing")
    .get()?.count;
  const privateNoteCount = db
    .prepare(
      "SELECT COUNT(*) AS count FROM Listing WHERE privateNote IS NOT NULL AND privateNote != ''",
    )
    .get()?.count;
  db.close();

  return {
    sourcePath,
    outputPath,
    userCount,
    listingCount,
    privateNoteCount,
    productionVisibleUserCount,
    personas: resolvedPersonas,
  };
}
