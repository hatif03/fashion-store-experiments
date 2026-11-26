import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const exe = process.platform === "win32" ? join(homedir(), ".local", "bin", "flagsmith.exe") : join(homedir(), ".local", "bin", "flagsmith");

if (!existsSync(exe)) {
  console.error(`Flagsmith CLI not found at ${exe}. See .agents/skills/flagsmith-experiment/SKILL.md.`);
  process.exit(1);
}

const result = spawnSync(exe, process.argv.slice(2), { stdio: "inherit" });
process.exit(result.status ?? 1);
