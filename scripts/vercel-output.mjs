// Packages a finished build (dist/) and the functions in server/ as Vercel's
// Build Output API v3 in .vercel/output, served at /api/<name>. Vercel runs
// Node functions as native ES modules without bundling, so the `@/` alias,
// extensionless imports and JSON imports under src/ only work once each
// function is bundled. The sources stay out of api/ so Vercel doesn't also
// build them unbundled.
//
//   npm run build:vercel
//
// Docs: https://vercel.com/docs/build-output-api

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { build } from "vite";

const root = resolve(import.meta.dirname, "..");
const out = join(root, ".vercel", "output");
const dist = join(root, "dist");

const FUNCTIONS = [
  { name: "chat", maxDuration: 60, streaming: true },
  { name: "track", maxDuration: 10 },
  { name: "stats", maxDuration: 10 },
];

if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/index.html is missing. Run the site build first.");
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(dist, join(out, "static"), { recursive: true });

for (const fn of FUNCTIONS) {
  const dir = join(out, "functions", "api", `${fn.name}.func`);
  await build({
    configFile: false,
    root,
    logLevel: "warn",
    resolve: { alias: { "@": join(root, "src") } },
    ssr: { noExternal: true, target: "node" },
    build: {
      ssr: join(root, "server", `${fn.name}.ts`),
      outDir: dir,
      emptyOutDir: true,
      target: "node24",
      minify: false,
      copyPublicDir: false,
      rolldownOptions: { output: { format: "es", entryFileNames: "index.mjs" } },
    },
  });
  writeFileSync(
    join(dir, ".vc-config.json"),
    JSON.stringify({
      runtime: "nodejs24.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
      maxDuration: fn.maxDuration,
      ...(fn.streaming ? { supportsResponseStreaming: true } : {}),
    }, null, 2),
  );
  writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }));
}

writeFileSync(
  join(out, "config.json"),
  JSON.stringify({
    version: 3,
    routes: [
      { src: "^/assets/(.*)$", headers: { "cache-control": "public, max-age=31536000, immutable" }, continue: true },
      { handle: "filesystem" },
      { src: "^/api/.*$", status: 404 },
      { src: "^/(.*)$", dest: "/index.html" },
    ],
  }, null, 2),
);

console.log(`Wrote ${out}: static site and ${FUNCTIONS.length} functions.`);
