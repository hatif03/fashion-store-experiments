import { useExperimentValue } from "@/analytics/flagsmith";
import { HOMEPAGE_EXPERIMENT } from "@/analytics/track";
import { useCatalog } from "@/catalog/CatalogProvider";
import { useDocumentTitle } from "@/lib/hooks";
import { FeaturedCollection } from "@/sections/FeaturedCollection";
import { GridHero, HeroPlaceholder } from "@/sections/GridHero";
import { Lookbook } from "@/sections/Lookbook";
import { RailHero } from "@/sections/RailHero";
import { Statement } from "@/sections/Statement";

export default function HomePage() {
  const { settings } = useCatalog();
  useDocumentTitle(`${settings.name} — ${settings.rail.eyebrow}`);
  // EXP-001 (docs/experiments/EXP-001-homepage-merchandising.md). Any value other than "grid" is the rail.
  const merchandising = useExperimentValue(HOMEPAGE_EXPERIMENT, "rail");
  return (
    <>
      {merchandising === null ? <HeroPlaceholder /> : merchandising === "grid" ? <GridHero /> : <RailHero />}
      <Statement />
      <FeaturedCollection />
      <Lookbook />
    </>
  );
}
