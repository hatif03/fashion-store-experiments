import { fileURLToPath, URL } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv, type Plugin, type ViteDevServer } from "vite";
import { defineConfig } from "vitest/config";

// Cloudflare's published Turnstile test site keys pass every visitor.
const TURNSTILE_TEST_SITE_KEY = /^[0-9]x0{20}[A-F]{2}$/;

/** Stops a production build that would take orders behind test protection. */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Serves POST /api/chat during `npm run dev`. Production uses api/chat.ts on the host. */
function associateDev(): Plugin {
  return {
    name: "stillform-associate",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      const env = loadEnv(server.config.mode, process.cwd(), "IFM_");
      for (const [key, value] of Object.entries(env)) process.env[key] ??= value;
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => {
        const path = req.url?.split("?")[0];
        if (path !== "/api/chat") return next();
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("POST only");
          return;
        }
        try {
          const raw = await readBody(req);
          const { handleAssociate } = (await server.ssrLoadModule("/src/associate/handle.ts")) as {
            handleAssociate: (body: unknown, emit: (event: unknown) => void) => Promise<void>;
          };
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache, no-transform");
          await handleAssociate(raw ? JSON.parse(raw) : {}, (event) => {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          });
          res.end();
        } catch (error) {
          if (!res.headersSent) res.statusCode = 500;
          res.end(`data: ${JSON.stringify({ type: "error", message: "The studio associate is unavailable." })}\n\n`);
          server.config.logger.error(error instanceof Error ? error.message : "associate failed");
        }
      });
    },
  };
}

function launchGuard(): Plugin {
  return {
    name: "stillform-launch-guard",
    apply: "build",
    configResolved({ mode, envDir, logger }) {
      if (mode === "demo") return;
      const env = loadEnv(mode, envDir || process.cwd(), "VITE_");
      const siteKey = env.VITE_TURNSTILE_SITE_KEY ?? "";
      if (TURNSTILE_TEST_SITE_KEY.test(siteKey)) {
        throw new Error("VITE_TURNSTILE_SITE_KEY is one of Cloudflare's test keys, which let anyone through. Use your own widget's site key for a production build (docs/DEPLOY.md).");
      }
      if (env.VITE_SUPABASE_URL && !siteKey) {
        logger.warn("\nVITE_TURNSTILE_SITE_KEY is not set: this build can show the store, but checkout will refuse orders.\n");
      }
    },
  };
}

// `vite build --mode demo` (npm run build:demo) is the public showroom: the
// built-in demo collection, the bag, no checkout and no Studio. It reads no
// .env files and blanks every backend setting, so stray Supabase or Turnstile
// values on a host or in .env.local can never connect it to a database.
const SHOWROOM = {
  "import.meta.env.VITE_SUPABASE_URL": '""',
  "import.meta.env.VITE_SUPABASE_ANON_KEY": '""',
  "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '""',
  "import.meta.env.VITE_TURNSTILE_SITE_KEY": '""',
  "import.meta.env.VITE_STUDIO_ENABLED": '"false"',
  // The Flagsmith client key is public by design. It comes from the host's
  // environment, since this build reads no .env file.
  "import.meta.env.VITE_FLAGSMITH_ENVIRONMENT_KEY": JSON.stringify(process.env.VITE_FLAGSMITH_ENVIRONMENT_KEY ?? ""),
  "import.meta.env.VITE_EVENT_LOG": JSON.stringify(process.env.VITE_EVENT_LOG ?? ""),
  // The simulated Studio at /demo/admin exists only in this build.
  __DEMO_DASHBOARD__: "true",
};

// Every other build and the dev server fold the demo away: the flag is
// replaced by a literal, so the demo's code is dead and never bundled.
const NO_DEMO = { __DEMO_DASHBOARD__: "false" };

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), launchGuard(), associateDev()],
  envDir: mode === "demo" ? false : undefined,
  define: mode === "demo" ? SHOWROOM : NO_DEMO,
  // Lets two dev servers (demo and live-backend tests) run side by side.
  cacheDir: process.env.VITE_CACHE_DIR ?? "node_modules/.vite",
  test: { include: ["src/**/*.test.ts"] },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
}));
