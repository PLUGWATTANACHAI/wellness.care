import { spawnSync } from "node:child_process";

const checks = [
  { name: "Secret audit", command: process.execPath, args: ["scripts/audit-secrets.mjs"] },
  { name: "Structure check", command: process.execPath, args: ["scripts/check-structure.mjs"] },
  { name: "Typecheck", command: "pnpm", args: ["typecheck"] },
];

const failed = [];

console.log("Wellnest pre-push check");
console.log("=======================");

for (const check of checks) {
  const result = spawnSync(check.command, check.args, {
    cwd: process.cwd(),
    stdio: "pipe",
    encoding: "utf8",
    env: { ...process.env, CI: "true" },
  });

  if (result.status === 0) {
    console.log(`OK - ${check.name}`);
    continue;
  }

  console.log(`FAIL - ${check.name}`);
  const output = `${result.error?.message || ""}\n${result.stdout || ""}${result.stderr || ""}`.trim();
  if (output) console.log(output);
  failed.push(check.name);
}

if (failed.length > 0) {
  console.log("");
  console.log("Do not push until failed checks are fixed.");
  process.exit(1);
}

console.log("");
console.log("Ready to push to private Git repository.");

