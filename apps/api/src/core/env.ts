import fs from "node:fs";
import path from "node:path";

export function loadDotEnv() {
  let currentDir = process.cwd();

  for (let depth = 0; depth < 5; depth += 1) {
    const envPath = path.join(currentDir, ".env");

    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");

      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex === -1) continue;

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim();

        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }

      return envPath;
    }

    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }

  return undefined;
}
