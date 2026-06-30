import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

const ignoredDirs = new Set([
  ".git",
  ".expo",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

const ignoredFiles = new Set([
  ".env",
  ".env.example",
  ".env.local",
  ".env.production",
  ".env.staging",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
]);

const riskyFilePatterns = [
  /^\.env$/,
  /^\.env\..+/,
  /service-account.*\.json$/i,
  /firebase.*\.json$/i,
  /google.*credentials.*\.json$/i,
];

const riskyContentPatterns = [
  { name: "AWS access key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "Google API key", pattern: /AIza[0-9A-Za-z_-]{20,}/ },
  { name: "JWT token", pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "Private key", pattern: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
  { name: "Stripe live secret", pattern: /sk_live_[0-9A-Za-z]{16,}/ },
  { name: "Postgres URL with password", pattern: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/ },
];

const findings = [];

function shouldIgnorePath(filePath) {
  const parts = filePath.split(path.sep);
  return parts.some((part) => ignoredDirs.has(part));
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (shouldIgnorePath(relativePath)) continue;

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!entry.isFile()) continue;

    checkFile(relativePath, fullPath);
  }
}

function checkFile(relativePath, fullPath) {
  const baseName = path.basename(relativePath);

  if (ignoredFiles.has(baseName)) return;

  if (riskyFilePatterns.some((pattern) => pattern.test(baseName))) {
    findings.push({
      file: relativePath,
      issue: "Risky secret file should not be committed",
    });
  }

  const stats = fs.statSync(fullPath);
  if (stats.size > 1024 * 1024) return;

  let content = "";
  try {
    content = fs.readFileSync(fullPath, "utf8");
  } catch {
    return;
  }

  for (const rule of riskyContentPatterns) {
    if (rule.pattern.test(content)) {
      findings.push({
        file: relativePath,
        issue: rule.name,
      });
    }
  }
}

walk(rootDir);

if (findings.length > 0) {
  console.error("Potential secret exposure found:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.issue}`);
  }
  process.exit(1);
}

console.log("Secret audit OK");
