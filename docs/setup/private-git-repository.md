# Private Git Repository Setup

## Goal

Prepare Wellnest to be stored in a private Git repository owned by the product owner or company.

## Recommended Repository

Use a private repository named:

```text
wellnest-app
```

Recommended owner:

- Personal account owned by the founder during early MVP, or
- Company organization account when the project becomes official

Do not create the repository under an outside developer's account.

## Before Creating The Repository

Run:

```bash
pnpm prepush
```

The repository is ready only when all checks pass.

## Suggested GitHub Steps

1. Sign in to GitHub.
2. Create a new private repository.
3. Repository name: `wellnest-app`.
4. Visibility: Private.
5. Do not add README, `.gitignore`, or license from GitHub UI because the project already has local files.
6. Copy the repository URL.
7. Connect local project to the remote repository.

## First Local Git Setup

Run inside `wellnest-app`:

```bash
git init
git add .
git status
```

Review the file list carefully. Make sure these are not included:

- `.env`
- `.env.local`
- `.env.production`
- `node_modules`
- real database exports
- real customer files
- service account JSON files

Then commit:

```bash
git commit -m "Initial Wellnest app foundation"
git branch -M main
git remote add origin REPLACE_WITH_PRIVATE_REPO_URL
git push -u origin main
```

## Branch Rules For Solo Founder

For early solo work:

- Keep `main` as the stable branch.
- Create feature branches for risky changes.
- Run `pnpm prepush` before every push.
- Keep a short note in `CHANGELOG.md` after meaningful milestones.

Suggested branch names:

```text
feature/booking-mvp
feature/location-consent
feature/payment-sandbox
docs/privacy-update
fix/api-health
```

## Future Team Rules

When a developer joins:

- Do not give direct production access by default.
- Require pull requests for `main`.
- Require passing checks before merge.
- Use separate accounts for each developer.
- Remove access when work ends.

## Emergency Recovery

If the MacBook is lost or broken:

1. Sign in to the Git provider on the primary machine.
2. Clone the private repository.
3. Copy `.env` values from the secret source.
4. Run `pnpm install`.
5. Run `pnpm status`.

The project should be recoverable without the old machine.

