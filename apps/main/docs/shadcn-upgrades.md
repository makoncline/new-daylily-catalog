# shadcn/ui upgrades

Use this checklist whenever shadcn/ui components are updated or overwritten.

## Upgrade command

```sh
pnpm dlx shadcn@latest add --all --overwrite --yes
```

## Post-upgrade fixes (project-specific)

1. Dialog viewport constraints

- File: `src/components/ui/dialog.tsx`
- Re-apply the constrained dialog classes on `DialogContent` so long forms
  never exceed the viewport and can scroll.
- Required classes:
  - `flex h-full max-h-[90vh] flex-col overflow-auto`

2. Button gradient variant

- File: `src/components/ui/button.tsx`
- Re-add the custom `gradient` variant (overwritten by shadcn updates).

## Verify

```sh
pnpm lint
```
