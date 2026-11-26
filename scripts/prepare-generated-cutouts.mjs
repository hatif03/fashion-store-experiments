// Turns AI-generated garment photographs into rail cut-outs.
//
// Reads assets/generated-source/cutouts/<product>__<colourway>.jpg, each a
// garment on the house hanger against a flat, uniform background, and writes
// public/media/products/<product>/<colourway>-front.webp on the shared
// 645 × 1000 rail canvas.
//
// Scale comes from the hanger hook, not the garment: the hook is the one part
// every photograph shares, so matching its length to the supplied cut-outs keeps
// every hanger the same size on the rail. A coat simply hangs longer than a tee.
//
//   node scripts/prepare-generated-cutouts.mjs [product__colourway ...]
//   node scripts/prepare-generated-cutouts.mjs --sheet   # also writes a contact sheet

import { mkdir, readdir } from "node:fs/promises";
import sharp from "sharp";

const SRC = "assets/generated-source/cutouts";
const OUT = "public/media/products";
const SHEET = "assets/generated-source/contact-sheet.png";
const CANVAS = { width: 645, height: 1000 };
const REFERENCES = ["heavyweight-tee/bone-front", "oxford-shirt/pale-blue-front", "fleece-hoodie/grey-marl-front", "pique-polo/bottle-front"];

/** Background: distance below which a pixel connected to the border is background. */
const FLOOD = 30;
/** Enclosed pockets of background (between an arm and the body) need a tighter match. */
const HOLE = 16;
const HOLE_MIN_AREA = 120;

async function rgba(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { px: data, w: info.width, h: info.height };
}

/** Top of the hook, its length to where the hanger widens, and its x position. */
function hookOf(alpha, w, h) {
  const opaque = (x, y) => alpha[y * w + x] > 128;
  let top = 0;
  while (top < h && !Array.from({ length: w }, (_, x) => opaque(x, top)).some(Boolean)) top++;
  const xs = [];
  for (let y = top; y < top + 6; y++) for (let x = 0; x < w; x++) if (opaque(x, y)) xs.push(x);
  const hookX = xs.reduce((sum, x) => sum + x, 0) / Math.max(1, xs.length);
  let end = top;
  for (; end < h; end++) {
    let count = 0;
    for (let x = 0; x < w; x++) if (opaque(x, end)) count++;
    if (count > w * 0.06) break;
  }
  return { top, length: end - top, x: hookX };
}

async function referenceHook() {
  const hooks = [];
  for (const ref of REFERENCES) {
    const { px, w, h } = await rgba(`${OUT}/${ref}.webp`);
    const alpha = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) alpha[i] = px[i * 4 + 3];
    hooks.push(hookOf(alpha, w, h));
  }
  const mean = (key) => hooks.reduce((sum, hook) => sum + hook[key], 0) / hooks.length;
  return { top: mean("top"), length: mean("length") };
}

function backgroundColour(px, w, h) {
  const samples = [[], [], []];
  const take = (x, y) => {
    const i = (y * w + x) * 4;
    for (let c = 0; c < 3; c++) samples[c].push(px[i + c]);
  };
  for (let x = 0; x < w; x += 2) {
    take(x, 0);
    take(x, h - 1);
  }
  for (let y = 0; y < h; y += 2) {
    take(0, y);
    take(w - 1, y);
  }
  return samples.map((values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]);
}

function cutOut({ px, w, h }) {
  const bg = backgroundColour(px, w, h);
  const dist = new Float32Array(w * h);
  for (let k = 0; k < w * h; k++) {
    const i = k * 4;
    dist[k] = Math.hypot(px[i] - bg[0], px[i + 1] - bg[1], px[i + 2] - bg[2]);
  }

  // 1. flood the background in from the border
  const background = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const seed = (k) => {
    if (!background[k] && dist[k] < FLOOD) {
      background[k] = 1;
      queue[tail++] = k;
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (head < tail) {
    const k = queue[head++];
    const x = k % w;
    if (x > 0) seed(k - 1);
    if (x < w - 1) seed(k + 1);
    if (k >= w) seed(k - w);
    if (k < w * (h - 1)) seed(k + w);
  }

  // 2. enclosed pockets that are plainly background
  const seen = new Uint8Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || background[start] || dist[start] >= HOLE) continue;
    const region = [start];
    seen[start] = 1;
    for (let r = 0; r < region.length; r++) {
      const k = region[r];
      const x = k % w;
      for (const n of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, k - w, k + w]) {
        if (n < 0 || n >= w * h || seen[n] || background[n] || dist[n] >= HOLE) continue;
        seen[n] = 1;
        region.push(n);
      }
    }
    if (region.length >= HOLE_MIN_AREA) for (const k of region) background[k] = 1;
  }

  // 3. pull the edge in by a pixel, then soften it, so no background fringe survives
  const alpha = new Float32Array(w * h);
  for (let k = 0; k < w * h; k++) alpha[k] = background[k] ? 0 : 1;
  const eroded = alpha.slice();
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x;
    if (alpha[k] && (!alpha[k - 1] || !alpha[k + 1] || !alpha[k - w] || !alpha[k + w])) eroded[k] = 0;
  }
  const soft = new Float32Array(w * h);
  const kernel = [0.25, 0.5, 0.25];
  const tmp = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 1; x < w - 1; x++) tmp[y * w + x] = kernel[0] * eroded[y * w + x - 1] + kernel[1] * eroded[y * w + x] + kernel[2] * eroded[y * w + x + 1];
  for (let y = 1; y < h - 1; y++) for (let x = 0; x < w; x++) soft[y * w + x] = kernel[0] * tmp[(y - 1) * w + x] + kernel[1] * tmp[y * w + x] + kernel[2] * tmp[(y + 1) * w + x];

  // 4. remove the background's tint from partly transparent edge pixels
  const out = Buffer.alloc(w * h * 4);
  for (let k = 0; k < w * h; k++) {
    const a = soft[k];
    const i = k * 4;
    for (let c = 0; c < 3; c++) {
      const value = a > 0 && a < 1 ? (px[i + c] - (1 - a) * bg[c]) / a : px[i + c];
      out[i + c] = Math.max(0, Math.min(255, Math.round(value)));
    }
    out[i + 3] = Math.round(a * 255);
  }
  return { px: out, w, h, alpha: Uint8Array.from(soft, (a) => Math.round(a * 255)) };
}

function bounds(alpha, w, h) {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (alpha[y * w + x] < 8) continue;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

async function prepare(name, ref) {
  const [product, colourway] = name.split("__");
  const cut = cutOut(await rgba(`${SRC}/${name}.jpg`));
  const hook = hookOf(cut.alpha, cut.w, cut.h);
  const box = bounds(cut.alpha, cut.w, cut.h);

  // hook-matched scale, reduced only if the garment would leave the canvas
  const halfWidth = Math.max(hook.x - box.minX, box.maxX - hook.x) + 1;
  const below = box.maxY - hook.top + 1;
  const scale = Math.min(ref.length / hook.length, (CANVAS.width / 2 - 4) / halfWidth, (CANVAS.height - ref.top - 4) / below);

  const width = Math.round(cut.w * scale);
  const height = Math.round(cut.h * scale);
  const left = Math.round(CANVAS.width / 2 - hook.x * scale);
  const top = Math.round(ref.top - hook.top * scale);
  const resized = await sharp(cut.px, { raw: { width: cut.w, height: cut.h, channels: 4 } }).resize(width, height, { kernel: "lanczos3" }).png().toBuffer();

  // place on the canvas, cropping whatever falls outside it
  const crop = { left: Math.max(0, -left), top: Math.max(0, -top) };
  const visible = { width: Math.min(width - crop.left, CANVAS.width - Math.max(0, left)), height: Math.min(height - crop.top, CANVAS.height - Math.max(0, top)) };
  const piece = await sharp(resized).extract({ ...crop, ...visible }).toBuffer();

  await mkdir(`${OUT}/${product}`, { recursive: true });
  const file = `${OUT}/${product}/${colourway}-front.webp`;
  await sharp({ create: { ...CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: piece, left: Math.max(0, left), top: Math.max(0, top) }])
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(file);
  console.log(`wrote ${file} (scale ${scale.toFixed(2)}${scale < ref.length / hook.length - 0.001 ? ", fitted to canvas" : ""})`);
  return file;
}

async function contactSheet(files) {
  const cell = { width: 215, height: 333 };
  const columns = 6;
  const rows = Math.ceil(files.length / columns);
  const tiles = await Promise.all(
    files.map(async (file, i) => ({
      input: await sharp(file).resize(cell.width, cell.height).toBuffer(),
      left: (i % columns) * cell.width,
      top: Math.floor(i / columns) * cell.height,
    })),
  );
  await sharp({ create: { width: cell.width * columns, height: cell.height * rows, channels: 4, background: "#E8E1D3" } }).composite(tiles).png().toFile(SHEET);
  console.log(`wrote ${SHEET}`);
}

const args = process.argv.slice(2);
const only = args.filter((arg) => !arg.startsWith("--"));
const names = (await readdir(SRC)).filter((file) => file.endsWith(".jpg")).map((file) => file.replace(/\.jpg$/, ""));
const ref = await referenceHook();
console.log(`reference hook: top ${ref.top.toFixed(1)} px, length ${ref.length.toFixed(1)} px`);
const files = [];
for (const name of names.filter((n) => !only.length || only.includes(n))) files.push(await prepare(name, ref));
if (args.includes("--sheet")) await contactSheet([...REFERENCES.map((r) => `${OUT}/${r}.webp`), ...files]);
