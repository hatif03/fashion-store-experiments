import { cpSync, mkdirSync, rmSync } from "node:fs";

// One copy of the skills is edited, in .agents/skills. Cursor, Claude Code, and Kiro
// each discover a different directory, so this mirrors the canonical skills there.
const targets = [".cursor/skills", ".claude/skills", ".kiro/skills"];

for (const target of targets) {
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(".agents/skills", target, { recursive: true });
}

console.log(`Mirrored .agents/skills to ${targets.join(", ")}`);
