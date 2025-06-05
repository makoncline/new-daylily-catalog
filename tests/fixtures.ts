import { test as base, expect } from '@playwright/test';
import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import http from 'http';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

async function waitForServer(url: string, timeout = 30000) {
  const start = Date.now();
  while (true) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(url, (res) => {
          res.resume();
          resolve();
        });
        req.on('error', reject);
      });
      return;
    } catch {
      if (Date.now() - start > timeout) throw new Error('Server start timeout');
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

export const test = base.extend<{ db: PrismaClient }>({
  db: async ({}, use, testInfo) => {
    const dbFile = path.join(testInfo.outputDir, `test-${randomUUID()}.sqlite`);
    const databaseUrl = `file:${dbFile}`;

    execSync('npx prisma db push --schema=prisma/schema.prisma', {
      env: { ...process.env, LOCAL_DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    });

    execSync('npx tsx prisma/test-seed.ts', {
      env: { ...process.env, LOCAL_DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    });

    const server = spawn('npm', ['run', 'start'], {
      env: { ...process.env, LOCAL_DATABASE_URL: databaseUrl, PORT: '3000' },
      stdio: 'inherit',
    });

    await waitForServer('http://localhost:3000');

    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

    await use(prisma);

    server.kill();
    await prisma.$disconnect();
    await fs.unlink(dbFile);
  },
});

export { expect } from '@playwright/test';
