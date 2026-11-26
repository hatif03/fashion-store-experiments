/** The middle in-stock size. An even count takes the lower of the two middle ones. */
export function suggestedSize(sizes: readonly string[], inStock: (size: string) => boolean): string | null {
  const available = sizes.filter((size) => inStock(size));
  if (available.length === 0) return null;
  return available[Math.floor((available.length - 1) / 2)] ?? null;
}
