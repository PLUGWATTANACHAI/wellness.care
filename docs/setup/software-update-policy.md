# Software Update Policy

## Goal

Keep Wellnest dependencies current without breaking the app unexpectedly.

## Rule

Do not blindly upgrade every package to the newest major version.

Use this process:

1. Check the currently installed versions.
2. Check the latest available versions from the package registry or official documentation.
3. Separate updates into patch, minor, and major upgrades.
4. Apply safe patch/minor upgrades first.
5. Treat major upgrades as planned sprint work.
6. Run checks after every update.

## Required Checks After Updating

Run:

```bash
pnpm install
pnpm status
pnpm prepush
```

For mobile dependency updates, also run:

```bash
pnpm dev:mobile
```

For API dependency updates, also run:

```bash
pnpm dev:api
pnpm db:check
```

## Major Upgrade Rule

Major upgrades require a short upgrade note because they can break APIs.

Examples:

- Expo SDK major version
- React Native major version
- Fastify major version
- Vite major version
- TypeScript major version

## Frequency

During MVP build:

- Check dependency freshness before each foundation sprint.
- Apply patch/minor updates when checks pass.
- Schedule major updates only when the current sprint is stable.

Before MVP launch:

- Run a full dependency review.
- Remove unused dependencies.
- Confirm security warnings.
- Freeze versions for launch candidate testing.

## Owner

เอ็น will help check, update, and test dependencies.

พี่ปลั๊ก should approve major upgrades or any change that affects paid services, app store submission, database behavior, or production data.

## Current Status

Reviewed on 2026-06-20:

- `pg` updated to the latest available version in this sprint.
- Expo, React Native, React, Vite, TypeScript, and Fastify-related major upgrades are intentionally deferred to a dedicated upgrade sprint.
