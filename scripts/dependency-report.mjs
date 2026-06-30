import { spawnSync } from "node:child_process";

const result = spawnSync("pnpm", ["outdated", "--recursive"], {
  cwd: process.cwd(),
  stdio: "pipe",
  encoding: "utf8",
  env: { ...process.env, CI: "true" },
});

console.log("Wellnest dependency freshness report");
console.log("====================================");

if (result.status === 0 && !result.stdout.trim()) {
  console.log("No outdated dependencies reported.");
  process.exit(0);
}

const output = `${result.stdout || ""}${result.stderr || ""}`.trim();

if (output) {
  console.log(output);
}

if (result.status !== 0 && !output) {
  console.log("Unable to check dependencies. Confirm network access and pnpm install state.");
}

