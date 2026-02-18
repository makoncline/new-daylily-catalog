# Napkin

## Corrections
| Date | Source | What Went Wrong | What To Do Instead |
|------|--------|----------------|-------------------|
| 2026-02-17 | self | Did not initialize napkin notes at session start | Always read or create `.claude/napkin.md` before substantial work in new sessions |
| 2026-02-18 | user | Tried app-level sort fixes before validating raw DB ordering | Run direct `sqlite3` query on `prisma/local-prod-copy-daylily-catalog.db` first for sort regressions |
| 2026-02-18 | self | Sorting changes appeared ineffective due stale Next cache keys/build cache | Bust `.next` cache or version cache keys when changing ordering semantics |

## User Preferences
- Prefer pragmatic, minimal changes with SEO focus on static public pages.
- Keep legacy behavior intact where old links may still exist.
- For tests, prefer integration/e2e coverage and avoid redundant type-only tests.
- For public SEO pilots, prioritize static rendering and ISR over dynamic query-driven SSR.
- For query/order regressions, validate behavior directly in SQLite before app-layer changes.
- Prefer concise cultivar-link UX (icon or daylily-data section link) over verbose inline "Linked Daylily Database Cultivar..." copy.
- On SEO profile pages, lists should use card layout and deep-link into `/{slug}/catalog` with `lists` query param.

## Patterns That Work
- Use static rendering + ISR for high-value SEO public routes.
- Keep search/filter in URL for refresh persistence while narrowing canonical indexing surface.
- Build major route experiments in parallel namespaces (`/catalog-v2/...`) to de-risk migration.
- For rollingoaks (`2931` listings), SQL letters-first ordering with `LTRIM(title)` + `GLOB` works correctly in SQLite.

## Patterns That Don't Work
- Relying on client-only data loading for content intended for SEO indexing.

## Domain Notes
- Cultivar pages have moved toward static/ISR strategy.
- User profile pages can contain very large listing counts and need scale-aware behavior.
