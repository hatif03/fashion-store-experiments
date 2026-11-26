import * as React from "react";
import { Link } from "react-router";
import { useCatalog } from "@/catalog/CatalogProvider";
import { railEntries } from "@/catalog/selectors";
import { ProductCard } from "@/components/ProductCard";

function HeroFrame({ children, count }: { children?: React.ReactNode; count: number }) {
  const { rail } = useCatalog().settings;
  return (
    <section id="rail" aria-label={rail.heading} className="flex flex-col pt-16 md:min-h-[100svh]">
      <div className="mx-auto flex w-full max-w-[1600px] items-baseline justify-between gap-6 px-4 pt-6 sm:px-6 lg:px-10">
        <p className="label">{rail.eyebrow}</p>
        <p className="label hidden text-muted-foreground sm:block">
          <span className="tabular">{String(count).padStart(2, "0")}</span> pieces on the rail
        </p>
      </div>
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-8 sm:px-6 md:pt-10 lg:px-10">
        <h1 className="type-wide max-w-[18ch] text-balance text-[clamp(2.4rem,5.6vw,5.75rem)] font-extralight leading-[0.95] tracking-[-0.035em]">{rail.heading}</h1>
      </div>
      {children}
    </section>
  );
}

/** EXP-001 variation: the rail's pieces, in the rail's order, as a plain grid of product cards. */
export function GridHero() {
  const catalog = useCatalog();
  const entries = React.useMemo(() => railEntries(catalog), [catalog]);
  return (
    <HeroFrame count={entries.length}>
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-16 pt-6 sm:px-6 md:pb-20 lg:px-10">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-5">
          {entries.map((entry) => (
            <li key={entry.garment.id}>
              <ProductCard product={entry.product} colorwayId={entry.colorwayId} source="grid" />
            </li>
          ))}
        </ul>
        <div className="mt-12 flex items-center justify-between gap-6 border-t border-border pt-4">
          <p className="text-[14px] leading-relaxed text-muted-foreground">Choose a piece to see it up close.</p>
          <Link to="/shop" className="label link-draw shrink-0 py-1">
            Shop all pieces
          </Link>
        </div>
      </div>
    </HeroFrame>
  );
}

/** Held while flags load, identical for both versions, so neither is shown early. */
export function HeroPlaceholder() {
  const catalog = useCatalog();
  return (
    <HeroFrame count={catalog.settings.rail.placements.length}>
      <div aria-hidden="true" className="tone-bone mx-4 mb-10 min-h-[52svh] flex-1 sm:mx-6 lg:mx-10" />
    </HeroFrame>
  );
}
