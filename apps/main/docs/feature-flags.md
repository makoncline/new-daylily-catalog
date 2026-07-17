# Feature Flags

Feature flags are temporary rollout controls. Keep them default-off and remove
them after rollout.

## Server flags

Values live only in `/data/runtime-feature-flags.json`:

```json
{
  "publicCultivarSearch": true
}
```

Missing files, missing keys, malformed JSON, and non-boolean values fail closed.
Server routes use evaluators in `src/config/feature-flags.ts` as their
availability boundary. Cultivar search is also always disabled on Vercel.

Update a flag through the running VPS container:

```sh
cd /srv/stacks/daylilycatalog
docker compose exec app \
  node apps/main/scripts/set-feature-flag.mjs publicCultivarSearch true
```

The command validates the name and value, writes atomically, and reports the
effective state. Read the current public state at `/api/runtime-config`.

Before the first deployment, create the file with cultivar search enabled. The
old app ignores it and the new app reads it on its first request.

```sh
install -d -o 1001 -g 1001 /srv/stacks/daylilycatalog/data
cd /srv/stacks/daylilycatalog/data
printf '%s\n' '{"publicCultivarSearch":true}' > runtime-feature-flags.json.tmp
mv runtime-feature-flags.json.tmp runtime-feature-flags.json
chown 1001:1001 runtime-feature-flags.json
```

## Frontend flags

Public flags are exposed through `/api/runtime-config` with `Cache-Control:
no-store`. The provider starts disabled, loads after hydration, and updates on
the next page refresh. Read a flag through the typed hook:

```tsx
const enabled = useFeature("publicCultivarSearch");
```

## Flag lifecycle

1. Add the server evaluator and enforce it at the server boundary.
2. If the browser needs the value, add it to the client defaults and runtime
   snapshot.
3. Add one focused integration test.
4. After rollout, delete the flag and its configuration instead of retaining a
   permanent branch.
