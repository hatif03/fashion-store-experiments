import * as React from "react";
import { Link, useNavigate } from "react-router";
import { dollars, track } from "@/analytics/track";
import { bagSubtotal } from "@/bag/bag";
import { useBag } from "@/bag/BagProvider";
import { useCatalog } from "@/catalog/CatalogProvider";
import { colorwayOf, formatPrice, mediaById, variantBySku } from "@/catalog/selectors";
import { GarmentImage } from "@/components/GarmentImage";
import { rememberOrder, shippingFor, type PlacedOrder } from "./checkout";

const COUNTRIES = ["India", "United States", "United Kingdom", "Germany", "France", "Netherlands", "Spain", "Italy", "Sweden", "Canada", "Australia", "Japan", "Singapore", "United Arab Emirates", "Brazil", "Other"];
const SPEEDS = [
  { id: "standard", label: "Standard", detail: "4–6 working days", price: 0 },
  { id: "express", label: "Express", detail: "1–2 working days", price: 2500 },
] as const;
const PAYMENTS = [
  { id: "card", label: "Card" },
  { id: "wallet", label: "Apple Pay or Google Pay" },
  { id: "upi", label: "UPI" },
  { id: "cod", label: "Pay on delivery" },
] as const;
const STEPS = ["Delivery", "Payment", "Review"] as const;

type Speed = (typeof SPEEDS)[number]["id"];
type Payment = (typeof PAYMENTS)[number]["id"];

function demoReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `DEMO-${code}`;
}

/**
 * The showroom's checkout: the real flow's steps and totals, with no personal
 * details and no payment. Orders placed here measure intent, not purchases.
 */
export function DemoCheckout() {
  const catalog = useCatalog();
  const bag = useBag();
  const navigate = useNavigate();
  const [step, setStep] = React.useState(0);
  const [country, setCountry] = React.useState("");
  const [speed, setSpeed] = React.useState<Speed>("standard");
  const [payment, setPayment] = React.useState<Payment | "">("");
  const [error, setError] = React.useState<string | null>(null);
  const heading = React.useRef<HTMLHeadingElement>(null);

  const lines = bag.lines.flatMap((line) => {
    const found = variantBySku(catalog, line.sku);
    return found ? [{ ...line, ...found, colorway: colorwayOf(found.product, found.variant.colorwayId) }] : [];
  });
  const subtotal = bagSubtotal(catalog, bag.lines);
  const shipping = shippingFor(catalog, subtotal) + (SPEEDS.find((option) => option.id === speed)?.price ?? 0);
  const total = subtotal + shipping;
  const items = lines.reduce((sum, line) => sum + line.quantity, 0);

  const started = React.useRef(false);
  React.useEffect(() => {
    if (started.current || lines.length === 0) return;
    started.current = true;
    track("checkout_started", { value: dollars(subtotal), metadata: { items } });
  }, [lines.length, subtotal, items]);

  React.useEffect(() => {
    if (step > 0) heading.current?.focus();
  }, [step]);

  if (lines.length === 0) {
    return (
      <>
        <h1 className="type-wide text-[clamp(2rem,4vw,3rem)] font-extralight">Your bag is empty.</h1>
        <Link to="/shop" className="label link-draw mt-8 inline-block py-1">Browse all pieces</Link>
      </>
    );
  }

  const next = () => {
    if (step === 0 && !country) return setError("Choose where it would be delivered.");
    if (step === 1 && !payment) return setError("Choose how you would pay.");
    setError(null);
    track("checkout_step_completed", { value: dollars(total), metadata: step === 0 ? { step: "delivery", country, speed } : { step: "payment", payment } });
    setStep(step + 1);
  };

  const place = () => {
    const reference = demoReference();
    const order: PlacedOrder = {
      reference,
      status: "demo",
      paymentStatus: "none",
      paymentMethod: PAYMENTS.find((option) => option.id === payment)?.label ?? "Demo",
      paymentInstructions: "This was a demo order. Nothing was charged and nothing will be sent.",
      currency: catalog.settings.currency,
      subtotal,
      shipping,
      total,
      email: "",
      createdAt: new Date().toISOString(),
      items: lines.map((line) => ({
        name: line.product.name,
        colorway: line.colorway.name,
        size: line.variant.size,
        quantity: line.quantity,
        unitPrice: line.product.price,
        lineTotal: line.product.price * line.quantity,
        imageSrc: mediaById(catalog, line.colorway.media.front)?.src ?? null,
      })),
    };
    track("order_placed", { value: dollars(total), metadata: { items, country, speed, payment } });
    rememberOrder(order);
    bag.dispatch({ type: "clear" });
    navigate(`/order/${reference}`, { state: order, replace: true });
  };

  return (
    <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <p className="label text-muted-foreground">Checkout · demo</p>
          <h1 ref={heading} tabIndex={-1} className="type-wide text-[clamp(2rem,4vw,3.25rem)] font-extralight leading-none tracking-[-0.02em] outline-none">
            {STEPS[step]}
          </h1>
          <p className="max-w-[56ch] text-[14px] leading-relaxed text-muted-foreground">
            This store is a showroom. The checkout works end to end, but it asks for no name, address or card, charges nothing and sends nothing.
          </p>
        </div>

        <ol className="label flex gap-6 border-b border-border pb-4" aria-label="Checkout steps">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === step ? "step" : undefined} className={i === step ? "text-foreground" : i < step ? "text-muted-foreground" : "text-muted-foreground/50"}>
              <span className="tabular">{i + 1}</span> {label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="flex flex-col gap-8">
            <label className="flex max-w-sm flex-col gap-1.5">
              <span className="text-[13px] text-muted-foreground">Delivery country</span>
              <select value={country} onChange={(event) => setCountry(event.target.value)} className="w-full border border-border bg-transparent px-3.5 py-3 text-[15px] outline-none focus:border-foreground">
                <option value="">Choose a country</option>
                {COUNTRIES.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-[13px] text-muted-foreground">Delivery speed</legend>
              {SPEEDS.map((option) => (
                <Choice key={option.id} name="speed" checked={speed === option.id} onChange={() => setSpeed(option.id)}>
                  <span className="flex flex-1 items-baseline justify-between gap-4">
                    <span>
                      <span className="block text-[15px] font-medium">{option.label}</span>
                      <span className="text-[13px] text-muted-foreground">{option.detail}</span>
                    </span>
                    <span className="tabular text-[14px]">{option.price === 0 ? "Included" : formatPrice(catalog, option.price)}</span>
                  </span>
                </Choice>
              ))}
            </fieldset>
          </div>
        )}

        {step === 1 && (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-[13px] text-muted-foreground">How would you pay? Nothing is charged.</legend>
            {PAYMENTS.map((option) => (
              <Choice key={option.id} name="payment" checked={payment === option.id} onChange={() => setPayment(option.id)}>
                <span className="text-[15px] font-medium">{option.label}</span>
              </Choice>
            ))}
          </fieldset>
        )}

        {step === 2 && (
          <dl className="grid max-w-lg grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-[14px]">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd>{country} · {SPEEDS.find((option) => option.id === speed)?.label}</dd>
            <dt className="text-muted-foreground">Payment</dt>
            <dd>{PAYMENTS.find((option) => option.id === payment)?.label}</dd>
            <dt className="text-muted-foreground">Pieces</dt>
            <dd className="tabular">{items}</dd>
          </dl>
        )}

        <div aria-live="assertive">{error && <p className="border-l-2 border-foreground pl-3 text-[13px]">{error}</p>}</div>

        <div className="flex items-center gap-6">
          {step < 2 ? (
            <button type="button" onClick={next} className="flex h-13 items-center bg-foreground px-8 text-[13px] font-medium tracking-[0.06em] text-background transition-opacity hover:opacity-90">
              Continue
            </button>
          ) : (
            <button type="button" onClick={place} className="flex h-13 items-center gap-8 bg-foreground px-6 text-[13px] font-medium tracking-[0.06em] text-background transition-opacity hover:opacity-90">
              <span>Place demo order</span>
              <span className="tabular font-light">{formatPrice(catalog, total)}</span>
            </button>
          )}
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="label link-draw py-1">
              Back
            </button>
          )}
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="tone-bone flex flex-col gap-6 p-6">
          <h2 className="label">Summary</h2>
          <ul className="flex flex-col gap-4">
            {lines.map((line) => (
              <li key={line.sku} className="flex gap-4">
                <div className="relative aspect-[4/5] w-16 shrink-0 bg-plaster">
                  <GarmentImage mediaId={line.colorway.media.front} decorative className="absolute inset-x-0 bottom-[4%] top-[6%] size-full" />
                </div>
                <div className="flex min-w-0 flex-1 justify-between gap-3 text-[14px]">
                  <div>
                    <p className="font-medium">{line.product.name}</p>
                    <p className="text-[13px] text-muted-foreground">{line.colorway.name} · {line.variant.size} · × {line.quantity}</p>
                  </div>
                  <p className="tabular shrink-0 font-light">{formatPrice(catalog, line.product.price * line.quantity)}</p>
                </div>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-2 border-t border-border pt-5 text-[14px]">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular">{formatPrice(catalog, subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd className="tabular">{shipping === 0 ? "Included" : formatPrice(catalog, shipping)}</dd></div>
            <div className="flex justify-between border-t border-border pt-3 text-[16px]"><dt>Total</dt><dd className="tabular">{formatPrice(catalog, total)}</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  );
}

function Choice({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className={`flex max-w-lg cursor-pointer items-center gap-4 border p-4 transition-colors ${checked ? "border-foreground" : "border-border hover:border-foreground/40"}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="accent-[var(--color-foreground)]" />
      {children}
    </label>
  );
}
