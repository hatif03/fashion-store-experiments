import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const bin = join(homedir(), ".local", "bin");
const names = process.platform === "win32" ? ["flagsmith.exe", "flagsmith-cli.exe"] : ["flagsmith", "flagsmith-cli"];
const exe = names.map((name) => join(bin, name)).find((path) => existsSync(path));

if (!exe) {
  console.error(`Flagsmith CLI not found in ${bin}. See .agents/skills/flagsmith-experiment/SKILL.md.`);
  process.exit(1);
}

const result = spawnSync(exe, process.argv.slice(2), { stdio: "inherit" });
process.exit(result.status ?? 1);
