import { PrismaClient as PostgresClient } from "./generated/postgres-client";
import { PrismaClient as SQLiteClient } from "./generated/sqlite-client";

const postgres = new PostgresClient();
const sqlite = new SQLiteClient();

async function upsertUsers() {
  const users = await postgres.users.findMany();
  for (const user of users) {
    await sqlite.user.upsert({
      where: { id: user.id },
      update: {
        username: user.username,
        name: user.name,
        email: user.email,
        emailVerified: user.is_verified ? new Date() : null,
        image: user.avatar_url,
        role: user.is_admin ? "ADMIN" : "USER",
        verifiedAt: user.is_verified ? new Date() : null,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        freeUntil: user.free_until,
      },
      create: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        emailVerified: user.is_verified ? new Date() : null,
        image: user.avatar_url,
        role: user.is_admin ? "ADMIN" : "USER",
        verifiedAt: user.is_verified ? new Date() : null,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        freeUntil: user.free_until,
      },
    });
  }
}

async function main() {
  try {
    await upsertUsers();
    console.log("User migration completed successfully.");
  } catch (error) {
    console.error("Failed to migrate users:", error);
  } finally {
    await postgres.$disconnect();
    await sqlite.$disconnect();
  }
}

main();
