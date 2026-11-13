import { pullRealisticDataSeed } from "./realistic-data-seed-store.mjs";

const manifest = await pullRealisticDataSeed();
console.log(`Realistic seed ready: ${manifest.databasePath}`);
console.log("Local edits were replaced.");
