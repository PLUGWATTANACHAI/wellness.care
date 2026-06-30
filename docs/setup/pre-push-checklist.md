# Pre-Push Checklist

Run this before pushing code to Git or sharing the project.

## Command

```bash
pnpm prepush
```

## Manual Review

Before pushing, confirm:

- `.env` is not included
- `node_modules` is not included
- No real customer data is included
- No real payment key is included
- No real Google Maps key is included
- No production database dump is included
- `CHANGELOG.md` is updated for meaningful changes
- `codex.work/wellnest-project` is refreshed after the milestone

## If Checks Fail

Do not push.

Ask เอ็น to read the failed output and fix the issue first.

