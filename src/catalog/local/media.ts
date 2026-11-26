import type { MediaAsset, MediaOrigin } from "../types";
import editorialManifest from "./editorial-manifest.json";

// Rail cut-outs prepared by scripts/prepare-supplied-images.mjs from the images
// supplied with the clothing rail component. All share one 645 × 1000 canvas.

const RAIL_CANVAS = { width: 645, height: 1000 };
const VIEWS = ["front", "back", "side"] as const;

const RETOUCHED_NOTE = "Supplied cut-out with a third-party print retouched out. Replace with an original STILLFORM photograph.";
const SUPPLIED_NOTE = "Supplied stock cut-out. Replace with an original STILLFORM photograph on the same canvas.";

function railSet(product: string, colorway: string, label: string, origin: MediaOrigin): MediaAsset[] {
  return VIEWS.map((view) => ({
    id: `${product}/${colorway}/${view}`,
    src: `/media/products/${product}/${colorway}-${view}.webp`,
    alt: `${label}, ${view === "side" ? "side view" : `${view} view`}, on a wooden hanger`,
    ...RAIL_CANVAS,
    origin,
    replaceNote: origin === "supplied" ? SUPPLIED_NOTE : RETOUCHED_NOTE,
  }));
}

const assets: MediaAsset[] = [
  ...railSet("heavyweight-tee", "bone", "Heavyweight tee in bone", "supplied-retouched"),
  ...railSet("heavyweight-tee", "black", "Heavyweight tee in black", "supplied-retouched"),
  ...railSet("mariner-long-sleeve", "ink-stripe", "Mariner long sleeve in ink stripe", "supplied"),
  ...railSet("oxford-shirt", "pale-blue", "Oxford shirt in pale blue", "supplied-retouched"),
  ...railSet("lambswool-cardigan", "moss", "Lambswool cardigan in moss", "supplied"),
  ...railSet("henley", "rust", "Long-sleeve henley in rust", "supplied-retouched"),
  ...railSet("fleece-hoodie", "grey-marl", "Fleece hoodie in grey marl", "supplied-retouched"),
  ...railSet("fleece-crew", "oat", "Fleece crew in oat", "supplied-retouched"),
  ...railSet("pique-polo", "bottle", "Piqué polo in bottle green", "supplied-retouched"),
];

// Front-view cut-outs prepared by scripts/prepare-generated-cutouts.mjs from
// AI-generated photographs made with the supplied cut-outs as references.

const GENERATED_CUTOUT_NOTE = "AI-generated front view, made with the supplied cut-outs as references. Replace with a studio photograph (front, back and side) on the same canvas.";

function frontView(product: string, colorway: string, label: string): MediaAsset {
  return {
    id: `${product}/${colorway}/front`,
    src: `/media/products/${product}/${colorway}-front.webp`,
    alt: `${label}, front view, on a wooden hanger`,
    ...RAIL_CANVAS,
    origin: "generated",
    replaceNote: GENERATED_CUTOUT_NOTE,
  };
}

assets.push(
  frontView("heavyweight-tee", "olive", "Heavyweight tee in olive"),
  frontView("oxford-shirt", "white", "Oxford shirt in white"),
  frontView("fleece-hoodie", "black", "Fleece hoodie in black"),
  frontView("pique-polo", "navy", "Piqué polo in navy"),
  frontView("chore-jacket", "navy", "Chore jacket in navy canvas"),
  frontView("wool-overcoat", "camel", "Wool overcoat in camel"),
  frontView("quilted-liner", "olive", "Quilted liner jacket in olive"),
  frontView("pleated-trouser", "charcoal", "Pleated wool trousers in charcoal, folded over the hanger"),
  frontView("wide-chino", "stone", "Wide chinos in stone, folded over the hanger"),
  frontView("linen-camp-shirt", "ecru", "Linen camp shirt in ecru"),
  frontView("merino-crew", "navy", "Merino crewneck in navy"),
  frontView("merino-crew", "charcoal", "Merino crewneck in charcoal"),
  frontView("cashmere-cardigan", "oat", "Cropped cashmere cardigan in oat"),
  frontView("slip-dress", "ecru", "Silk slip dress in ecru"),
  frontView("rib-knit-dress", "black", "Rib knit dress in black"),
  frontView("poplin-shirt-dress", "white", "Poplin shirt dress in white"),
  frontView("wide-leg-trouser", "black", "Wide-leg trousers in black, folded over the hanger"),
);

// Campaign frames and fabric close-ups, prepared by scripts/prepare-editorial-images.mjs.
// Generated with Nano Banana 2.1 using the garment cut-outs above as references,
// so the clothes match the products. They stand in for a real campaign shoot.

const GENERATED_NOTE = "AI-generated stand-in made from the product cut-outs. Replace with a real campaign or studio photograph.";

const EDITORIAL: Record<keyof typeof editorialManifest, { alt: string; focus?: string }> = {
  "look-moss-rust": { alt: "A model in the Lambswool Cardigan in moss, worn open over the rust Long-Sleeve Henley, in a plaster-walled studio beside a clothing rail", focus: "20% 50%" },
  "look-black-tee": { alt: "A man in the black Heavyweight Tee against a graphite backdrop, side-lit", focus: "50% 30%" },
  "look-stripe-oat": { alt: "A model in the Mariner Long Sleeve with the Fleece Crew in oat knotted over her shoulders, against a limestone wall", focus: "38% 40%" },
  "look-oxford-hoodie": { alt: "A man seated on a wooden bench in the grey marl Fleece Hoodie over the pale blue Oxford Shirt, in a bare, sunlit room", focus: "80% 60%" },
  "detail-lambswool": { alt: "Close-up of the coarse moss lambswool knit and a corozo button on the cardigan placket" },
  "detail-bone-tee": { alt: "The close ribbed crew neck and dense jersey of the Heavyweight Tee in bone, worn", focus: "50% 40%" },
  "detail-fleece": { alt: "Hands adjusting the flat cotton drawcord of the grey marl Fleece Hoodie" },
  "detail-oxford": { alt: "The soft, unlined button-down collar of the pale blue Oxford Shirt" },
  "detail-mariner": { alt: "The boat neckline and knitted ink-and-bone stripe of the Mariner Long Sleeve, folded on linen" },
};

const editorial: MediaAsset[] = Object.entries(editorialManifest).map(([name, file]) => ({
  id: `editorial/${name}`,
  src: file.variants.at(-1)!.src,
  width: file.width,
  height: file.height,
  variants: file.variants,
  origin: "generated",
  replaceNote: GENERATED_NOTE,
  ...EDITORIAL[name as keyof typeof EDITORIAL],
}));

assets.push(...editorial);

export const media: Record<string, MediaAsset> = Object.fromEntries(assets.map((asset) => [asset.id, asset]));
