import { spawnSync } from "node:child_process";

const checks = [
  { name: "Secret audit", command: process.execPath, args: ["scripts/audit-secrets.mjs"] },
  { name: "Structure check", command: process.execPath, args: ["scripts/check-structure.mjs"] },
  { name: "Typecheck", command: "pnpm", args: ["typecheck"] },
];

const results = [];

for (const check of checks) {
  const result = spawnSync(check.command, check.args, {
    cwd: process.cwd(),
    stdio: "pipe",
    encoding: "utf8",
    env: { ...process.env, CI: "true" },
  });

  results.push({
    name: check.name,
    ok: result.status === 0,
    output: `${result.error?.message || ""}\n${result.stdout || ""}${result.stderr || ""}`.trim(),
  });
}

console.log("Wellnest project status");
console.log("=======================");

for (const result of results) {
  console.log(`${result.ok ? "OK" : "FAIL"} - ${result.name}`);
  if (!result.ok && result.output) {
    console.log(result.output);
  }
}

if (results.some((result) => !result.ok)) {
  console.log("");
  console.log("If this is a freshly moved project, run pnpm install first.");
  process.exit(1);
}
