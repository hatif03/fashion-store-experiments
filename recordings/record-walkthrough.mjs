import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "recordings");
const base = "https://stillform-sepia.vercel.app";

const controlQuery = query({
  internal: "1",
  preview: "rail",
  "preview.size_suggestion": "choose",
  "preview.complete_the_look": "shown",
  "preview.associate_greeting": "silent",
  "preview.buy_bar": "return",
});
const experimentQuery = query({
  internal: "1",
  preview: "grid",
  "preview.size_suggestion": "suggested",
  "preview.complete_the_look": "hidden",
  "preview.associate_greeting": "speaks",
  "preview.buy_bar": "adds",
});
const phoneControl = query({
  internal: "1",
  preview: "rail",
  "preview.size_suggestion": "choose",
  "preview.complete_the_look": "shown",
  "preview.associate_greeting": "silent",
  "preview.buy_bar": "return",
});
const phoneExperiment = query({
  internal: "1",
  preview: "grid",
  "preview.size_suggestion": "suggested",
  "preview.complete_the_look": "hidden",
  "preview.associate_greeting": "silent",
  "preview.buy_bar": "adds",
});

function query(entries) {
  return new URLSearchParams(entries).toString();
}

function href(pathname, search) {
  return `${base}${pathname}?${search}`;
}

const stage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>STILLFORM</title>
<style>
  html, body { margin: 0; height: 100%; background: #121110; color: #f8f6f1; font-family: "Segoe UI", sans-serif; }
  body { display: flex; flex-direction: column; }
  header, footer { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 0 22px; flex: none; }
  header { height: 42px; }
  footer { height: 40px; background: #1c1b19; }
  footer .scene { font-size: 15px; color: #f8f6f1; }
  .brand { font-size: 13px; letter-spacing: 0.22em; font-weight: 600; }
  .scene { font-size: 14px; letter-spacing: 0.01em; color: #eeeae3; }
  .stage { flex: 1; display: grid; grid-template-columns: 1fr 1fr; min-height: 0; background: #d3ccbf; gap: 1px; }
  .pane { display: flex; flex-direction: column; min-width: 0; min-height: 0; background: #eeeae3; }
  .pane header { height: 28px; background: #eeeae3; color: #121110; padding: 0 16px; overflow: hidden; }
  .pane h2 { margin: 0; font-size: 11px; font-weight: 650; letter-spacing: 0.16em; text-transform: uppercase; white-space: nowrap; }
  .pane p { margin: 0; font-size: 12px; color: #6b665d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  iframe { flex: 1; width: 100%; border: 0; background: #eeeae3; }
  body[data-layout="phone"] .stage { background: #2a2826; align-items: center; }
  body[data-layout="phone"] .pane { align-items: center; justify-content: center; background: #2a2826; }
  body[data-layout="phone"] .pane header { background: transparent; color: #f8f6f1; width: 390px; }
  body[data-layout="phone"] .pane h2 { font-size: 13px; letter-spacing: 0.18em; }
  body[data-layout="phone"] .pane p { display: none; }
  body[data-layout="phone"] iframe { flex: none; width: 390px; height: 760px; border-radius: 28px; box-shadow: 0 0 0 10px #121110, 0 24px 60px rgb(0 0 0 / 0.35); }
  #slate { position: fixed; inset: 0; z-index: 5; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: #121110; color: #f8f6f1; transition: opacity 500ms ease; }
  #slate.hide { opacity: 0; pointer-events: none; }
  #slate strong { font-size: 28px; font-weight: 560; letter-spacing: 0.28em; }
  #slate span { font-size: 16px; color: #c9c2b6; }
</style>
</head>
<body>
  <div id="slate"><strong>STILLFORM</strong><span id="slate-line">Five experiments, side by side</span></div>
  <header>
    <div class="brand">STILLFORM</div>
    <div class="scene" id="scene">Loading both versions</div>
  </header>
  <div class="stage">
    <section class="pane">
      <header><h2>Control</h2><p>Rail · choose a size · look shown · associate waits</p></header>
      <iframe id="control" name="control" title="Control" src="${href("/", controlQuery)}"></iframe>
    </section>
    <section class="pane">
      <header><h2>Experiment</h2><p>Grid · suggested size · look hidden · associate speaks</p></header>
      <iframe id="experiment" name="experiment" title="Experiment" src="${href("/", experimentQuery)}"></iframe>
    </section>
  </div>
  <footer><div class="scene" id="foot">Reviewer view. This browser is marked internal, so it is not part of the result.</div></footer>
</body>
</html>`;

const started = Date.now();
const marks = [];
let finished = false;
const log = (label) => {
  const at = ((Date.now() - started) / 1000).toFixed(1);
  marks.push({ t: Number(at), label });
  console.log(`${at}s  ${label}`);
};

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: "light",
  locale: "en-US",
  recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } },
});
await context.addInitScript(() => {
  const params = new URLSearchParams(location.search);
  const keep = [...params.entries()].filter(([key]) => key === "internal" || key === "preview" || key.startsWith("preview."));
  if (keep.length) {
    const merge = (url) => {
      if (typeof url !== "string" || url === "") return url;
      const next = new URL(url, location.href);
      for (const [key, value] of keep) if (!next.searchParams.has(key)) next.searchParams.set(key, value);
      return `${next.pathname}${next.search}${next.hash}`;
    };
    const push = history.pushState.bind(history);
    const replace = history.replaceState.bind(history);
    history.pushState = (state, title, url) => push(state, title, merge(url));
    history.replaceState = (state, title, url) => replace(state, title, merge(url));
  }
  if (!keep.length) return;
  const style = document.createElement("style");
  style.textContent = "@keyframes rec-ping { to { transform: scale(1.8); opacity: 0; } }";
  document.documentElement.appendChild(style);
  const cursor = document.createElement("div");
  cursor.setAttribute("aria-hidden", "true");
  cursor.style.cssText = "position:fixed;z-index:2147483647;left:0;top:0;width:24px;height:24px;pointer-events:none;filter:drop-shadow(0 1px 1px rgb(0 0 0 / .4));transform:translate(-80px,-80px)";
  cursor.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M3 2 L3 19.5 L8 14.8 L11.4 22 L14.2 20.9 L10.7 13.8 L17.8 13.8 Z" fill="#f8f6f1" stroke="#121110" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
  document.documentElement.appendChild(cursor);
  const place = (event) => {
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
  };
  addEventListener("pointermove", place, true);
  addEventListener("pointerdown", (event) => {
    place(event);
    const ring = document.createElement("div");
    ring.style.cssText = `position:fixed;z-index:2147483646;left:${event.clientX - 10}px;top:${event.clientY - 10}px;width:20px;height:20px;border:2px solid #121110;border-radius:50%;pointer-events:none;animation:rec-ping .4s ease-out forwards`;
    document.documentElement.appendChild(ring);
    setTimeout(() => ring.remove(), 420);
  }, true);
});

const page = await context.newPage();
page.setDefaultTimeout(20_000);
const video = page.video();

try {
  await page.setContent(stage, { waitUntil: "load" });
  const control = () => {
    const frame = page.frame({ name: "control" });
    if (!frame) throw new Error("Control frame is missing");
    return frame;
  };
  const experiment = () => {
    const frame = page.frame({ name: "experiment" });
    if (!frame) throw new Error("Experiment frame is missing");
    return frame;
  };
  const hold = (ms) => page.waitForTimeout(ms);
  const scene = async (text, foot) => {
    log(text);
    await page.locator("#scene").evaluate((node, value) => {
      node.textContent = value;
    }, text);
    if (foot) {
      await page.locator("#foot").evaluate((node, value) => {
        node.textContent = value;
      }, foot);
    }
  };
  const hideSlate = async () => {
    await page.locator("#slate").evaluate((node) => node.classList.add("hide"));
    await hold(520);
  };
  const showSlate = async (line) => {
    await page.locator("#slate-line").evaluate((node, value) => {
      node.textContent = value;
    }, line);
    await page.locator("#slate").evaluate((node) => node.classList.remove("hide"));
    await hold(700);
  };
  const smoothScroll = (frame, top) => frame.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), top);

  log("waiting for both homepages");
  await control().locator("[data-mode='rail']").waitFor();
  await experiment().locator("#rail ul").first().waitFor();
  await control().locator("[data-garment='2']").waitFor();
  await hold(1600);
  await scene("Homepage — the rail, or the same ten pieces as a grid");
  await hideSlate();

  const stageBox = await control().locator("[data-stage]").boundingBox();
  if (stageBox) {
    const y = stageBox.y + stageBox.height * 0.62;
    await page.mouse.move(stageBox.x + 70, y);
    for (let step = 1; step <= 7; step++) {
      await page.mouse.move(stageBox.x + 70 + ((stageBox.width - 140) * step) / 7, y, { steps: 8 });
      await hold(220);
    }
  }
  await hold(500);
  await experiment().getByRole("link", { name: /Chore Jacket/ }).first().hover();
  await hold(1400);

  await scene("Below the hero, the rest of the homepage is the same");
  await Promise.all([smoothScroll(control(), 640), smoothScroll(experiment(), 640)]);
  await hold(1700);
  await Promise.all([smoothScroll(control(), 0), smoothScroll(experiment(), 0)]);
  await hold(1100);

  await scene("Open the chore jacket — take it off the rail, or choose the card");
  const railBox = await control().locator("[data-stage]").boundingBox();
  if (!railBox) throw new Error("The rail is not on screen");
  const railY = railBox.y + railBox.height * 0.58;
  let foundJacket = false;
  for (let step = 0; step <= 28; step++) {
    await page.mouse.move(railBox.x + 28 + ((railBox.width - 56) * step) / 28, railY);
    await hold(70);
    const caption = await control().locator("[id$='-caption']").innerText().catch(() => "");
    if (caption.includes("Chore Jacket")) {
      foundJacket = true;
      break;
    }
  }
  if (!foundJacket) throw new Error("The chore jacket never came forward on the rail");
  await hold(600);
  const garment = control().getByRole("button", { name: "Chore Jacket" });
  await garment.focus();
  await garment.press("Enter");
  await control().getByRole("link", { name: "Full details" }).waitFor();
  await hold(1600);
  await control().getByRole("link", { name: "Full details" }).click();
  await experiment().getByRole("link", { name: /Chore Jacket/ }).first().click();

  await control().getByRole("heading", { name: "Chore Jacket", level: 1 }).waitFor();
  await experiment().getByRole("heading", { name: "Chore Jacket", level: 1 }).waitFor();
  await experiment().getByText(/Size — suggested/).waitFor();
  log(`product urls ${control().url()} || ${experiment().url()}`);
  await scene("A size is suggested on the right. The left still asks you to choose.");
  await hold(4200);

  await scene("After eight seconds on the product, the associate speaks on the right");
  await experiment().getByText(/is in front of you/).waitFor({ timeout: 12_000 });
  await hold(2600);
  await experiment().getByRole("dialog", { name: "Studio associate" }).getByRole("button", { name: "Close" }).click();
  await hold(400);

  await scene("Complete the look stays on the left, and is removed on the right");
  await control().locator("#pairs-title").evaluate((node) => node.scrollIntoView({ behavior: "smooth", block: "center" }));
  await experiment().evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  await hold(3000);
  await Promise.all([smoothScroll(control(), 0), smoothScroll(experiment(), 0)]);
  await hold(900);

  await scene("Add the jacket. Without a size, the left refuses.");
  await control().getByRole("button", { name: /Add to bag/ }).evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await experiment().getByRole("button", { name: /Add to bag/ }).evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await hold(500);
  await control().getByRole("button", { name: /Add to bag/ }).click();
  await control().getByText("Choose a size first.").waitFor();
  await hold(1500);
  const medium = control().locator("label", { hasText: /^M$/ });
  await medium.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await hold(400);
  await medium.click();
  await hold(700);
  await control().getByRole("button", { name: /Add to bag/ }).click();
  await control().getByText(/Added Chore Jacket/).waitFor();
  await hold(400);
  await experiment().getByRole("button", { name: /Add to bag/ }).click();
  await experiment().getByText(/Added Chore Jacket/).waitFor();
  await hold(1200);

  await scene("The bag, then demo checkout. Nothing is charged and no details are asked.");
  await control().getByRole("button", { name: /^Bag,/ }).click();
  await hold(400);
  await experiment().getByRole("button", { name: /^Bag,/ }).click();
  await hold(1600);
  await control().getByRole("link", { name: "Checkout" }).click();
  await experiment().getByRole("link", { name: "Checkout" }).click();
  await control().getByRole("heading", { name: "Delivery" }).waitFor();
  await experiment().getByRole("heading", { name: "Delivery" }).waitFor();
  await hold(800);
  await control().getByLabel("Delivery country").selectOption("India");
  await experiment().getByLabel("Delivery country").selectOption("India");
  await hold(900);
  await control().getByRole("button", { name: "Continue" }).click();
  await experiment().getByRole("button", { name: "Continue" }).click();
  await control().getByRole("heading", { name: "Payment" }).waitFor();
  await hold(700);
  await control().getByRole("radio", { name: "Card" }).click();
  await experiment().getByRole("radio", { name: "Card" }).click();
  await hold(800);
  await control().getByRole("button", { name: "Continue" }).click();
  await experiment().getByRole("button", { name: "Continue" }).click();
  await control().getByRole("heading", { name: "Review" }).waitFor();
  await hold(1200);
  await control().getByRole("button", { name: /Place demo order/ }).click();
  await experiment().getByRole("button", { name: /Place demo order/ }).click();
  await control().getByRole("heading", { name: "Thank you." }).waitFor();
  await experiment().getByRole("heading", { name: "Thank you." }).waitFor();
  await hold(2200);

  await scene("Continue through the shop");
  await control().getByRole("link", { name: "Continue browsing" }).click();
  await experiment().getByRole("link", { name: "Continue browsing" }).click();
  await control().getByRole("heading", { name: "All pieces" }).waitFor();
  await hold(700);
  await control().getByRole("button", { name: /Outerwear/ }).click();
  await experiment().getByRole("button", { name: /Outerwear/ }).click();
  await control().getByRole("heading", { name: "Outerwear" }).waitFor();
  await hold(1800);

  await scene("Shipping and returns");
  await control().getByRole("link", { name: "Shipping and returns" }).click();
  await experiment().getByRole("link", { name: "Shipping and returns" }).click();
  await control().getByRole("heading", { name: "Shipping and returns" }).waitFor();
  await hold(1800);

  await scene("The live map of real visits, with all five experiments");
  await control().getByRole("link", { name: /Live visitor data/ }).click();
  await experiment().getByRole("link", { name: /Live visitor data/ }).click();
  await control().getByRole("heading", { name: "Who is in the store." }).waitFor();
  await experiment().getByRole("heading", { name: "Who is in the store." }).waitFor();
  await Promise.all([
    control().evaluate(() => window.scrollTo(0, 0)),
    experiment().evaluate(() => window.scrollTo(0, 0)),
  ]);
  await control()
    .waitForFunction(() => Number(document.querySelector("dd")?.textContent?.replace(/,/g, "") ?? "0") > 0, null, { timeout: 8000 })
    .catch(() => undefined);
  await hold(1200);
  await control().getByRole("heading", { name: "Five experiments" }).evaluate((node) => node.scrollIntoView({ behavior: "smooth", block: "center" }));
  await experiment().getByRole("heading", { name: "Five experiments" }).evaluate((node) => node.scrollIntoView({ behavior: "smooth", block: "center" }));
  await hold(3200);

  await scene("The demo studio. Fictional data, no login.");
  await Promise.all([
    control().goto(href("/demo/admin", controlQuery), { waitUntil: "domcontentloaded" }),
    experiment().goto(href("/demo/admin", experimentQuery), { waitUntil: "domcontentloaded" }),
  ]);
  await control().getByText("Demo Studio").first().waitFor();
  await experiment().getByText("Demo Studio").first().waitFor();
  await hold(2800);

  await showSlate("On a phone, the buy bar");
  await page.evaluate(() => {
    document.body.dataset.layout = "phone";
  });
  await scene("On a phone the bar scrolls back, or it adds the size already chosen", "The buy bar only exists on a phone, and only once the sizes have scrolled away.");
  await Promise.all([
    control().goto(href("/products/chore-jacket", phoneControl), { waitUntil: "domcontentloaded" }),
    experiment().goto(href("/products/chore-jacket", phoneExperiment), { waitUntil: "domcontentloaded" }),
  ]);
  await control().getByRole("heading", { name: "Chore Jacket", level: 1 }).waitFor();
  await experiment().getByRole("heading", { name: "Chore Jacket", level: 1 }).waitFor();
  await hideSlate();
  const revealBar = (frame) => frame.evaluate(() => window.scrollTo(0, 2400));
  await Promise.all([revealBar(control()), revealBar(experiment())]);
  await hold(600);
  await control().locator(".fixed").getByRole("button", { name: "Choose a size" }).waitFor();
  await experiment().locator(".fixed").getByRole("button", { name: /Add to bag/ }).waitFor();
  await hold(2200);
  await experiment().locator(".fixed").getByRole("button", { name: /Add to bag/ }).click();
  await experiment().getByRole("button", { name: /Bag, 1 item/ }).waitFor();
  await hold(800);
  await control().locator(".fixed").getByRole("button", { name: "Choose a size" }).click();
  await hold(1800);
  await scene("That’s the store, and the five differences running on it");
  await hold(1600);
  finished = true;
  log("done");
} catch (error) {
  log(`failed ${error instanceof Error ? error.message : String(error)}`);
  const shot = path.join(outDir, "walkthrough-error.png");
  await page.screenshot({ path: shot }).catch(() => undefined);
  throw error;
} finally {
  writeFileSync(path.join(outDir, "marks.json"), JSON.stringify(marks, null, 2));
  await context.close();
  await browser.close();
  const webm = await video.path();
  if (!finished) console.log(`stopped before the end. webm kept at ${webm}`);
  else {
    const mp4 = path.join(outDir, "stillform-side-by-side.mp4");
    const encoded = spawnSync(
      "C:\\ffmpeg\\ffmpeg.exe",
      ["-y", "-i", webm, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-crf", "20", mp4],
      { stdio: "inherit" },
    );
    if (encoded.status !== 0) throw new Error("ffmpeg failed");
    console.log(mp4);
  }
}
