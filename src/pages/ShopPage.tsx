import { useSearchParams } from "react-router";
import { track } from "@/analytics/track";
import { useCatalog } from "@/catalog/CatalogProvider";
import { activeProducts } from "@/catalog/selectors";
import type { Product } from "@/catalog/types";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { useDocumentTitle } from "@/lib/hooks";

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

/** The catalogue lists newer pieces last, so "newest" is the catalogue order reversed. */
function sorted(products: Product[], sort: Sort): Product[] {
  if (sort === "newest") return [...products].reverse();
  if (sort === "price-asc") return [...products].sort((a, b) => a.price - b.price);
  if (sort === "price-desc") return [...products].sort((a, b) => b.price - a.price);
  return products;
}

export default function ShopPage() {
  const catalog = useCatalog();
  const [params, setParams] = useSearchParams();
  const products = activeProducts(catalog);
  const categories = catalog.categories.filter((category) => products.some((product) => product.category === category.id));
  const current = categories.find((category) => category.id === params.get("category")) ?? null;
  const sort: Sort = SORTS.find((option) => option.value === params.get("sort"))?.value ?? "featured";
  const shown = sorted(current ? products.filter((product) => product.category === current.id) : products, sort);
  useDocumentTitle(`${current ? current.label : "All pieces"} — ${catalog.settings.name}`);

  const filters: { value: string | null; label: string; count: number }[] = [
    { value: null, label: "All", count: products.length },
    ...categories.map((category) => ({ value: category.id, label: category.label, count: products.filter((product) => product.category === category.id).length })),
  ];

  const update = (category: string | null, nextSort: Sort) => {
    const next: Record<string, string> = {};
    if (category) next.category = category;
    if (nextSort !== "featured") next.sort = nextSort;
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-28 pt-32 sm:px-6 md:pt-40 lg:px-10">
      <div className="flex flex-col gap-10 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-4">
          <p className="label text-muted-foreground">{catalog.settings.rail.eyebrow}</p>
          <h1 className="type-wide text-[clamp(2.5rem,5vw,4.5rem)] font-extralight leading-none tracking-[-0.02em]">{current ? current.label : "All pieces"}</h1>
        </div>
        <div className="flex flex-col gap-5 md:items-end">
          <nav aria-label="Filter by category" className="-mx-1 flex flex-wrap gap-x-6 gap-y-2">
            {filters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                aria-pressed={(current?.id ?? null) === filter.value}
                onClick={() => {
                  track("shop_filtered", { metadata: { category: filter.value ?? "all" } });
                  update(filter.value, sort);
                }}
                className={`label link-draw px-1 py-1 ${(current?.id ?? null) === filter.value ? "text-foreground [background-size:100%_1px]" : "text-muted-foreground hover:text-foreground"}`}
              >
                {filter.label} <span className="tabular ml-0.5 opacity-60">{filter.count}</span>
              </button>
            ))}
          </nav>
          <label className="label flex items-center gap-3 text-muted-foreground">
            Sort
            <select
              value={sort}
              onChange={(event) => {
                const next = event.target.value as Sort;
                track("shop_sorted", { metadata: { sort: next } });
                update(current?.id ?? null, next);
              }}
              className="label cursor-pointer border-b border-border bg-transparent py-1 pr-1 text-foreground outline-none focus-visible:border-foreground"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <ul className="mt-12 grid gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((product, i) => (
          <Reveal as="li" key={product.id} delay={(i % 4) * 90}>
            <ProductCard product={product} source="shop" />
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
