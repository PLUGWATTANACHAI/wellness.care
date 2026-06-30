# Solo Local Workflow

## Goal

Help a solo founder operate Wellnest safely without a development team.

## Daily Start Checklist

After moving the project to a new machine, install dependencies first:

```bash
pnpm install
```

Before editing:

```bash
pnpm check:secrets
pnpm check:structure
pnpm typecheck
```

If any check fails, fix it before continuing to larger changes.

## Before Sharing Or Moving Files

Run:

```bash
pnpm check:secrets
pnpm check:structure
pnpm typecheck
```

Then refresh the move pack:

```bash
rsync -a --exclude node_modules --exclude .pnpm-store --exclude .env --exclude '.env.*' wellnest-app codex.work/wellnest-project/
rsync -a outputs/wellnest_app_spec codex.work/wellnest-project/outputs/
```

## What To Record After Each Sprint

Update:

- `CHANGELOG.md`
- A sprint result file in `outputs/wellnest_app_spec`
- `codex.work/wellnest-project`

## Solo Safety Rules

- Never put real secrets in `.env.example`
- Never share `.env`
- Never use production database for experiments
- Never run migrations on production without backup
- Keep every important decision in a markdown file
- Sync the move pack after every meaningful project milestone

## Ready For Git Checklist

- Dependencies are installed on the current machine
- `pnpm check:secrets` passes
- `pnpm check:structure` passes
- `pnpm typecheck` passes
- `.env` is ignored
- `node_modules` is ignored
- README explains setup
- Move pack is refreshed
