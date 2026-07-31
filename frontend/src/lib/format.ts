/**
 * Peso formatting. The landing page is a document about money, so figures are
 * rendered through one function rather than hand-typed per component — a stray
 * "P22,000" or "₱22000" would undercut the whole premise of the page.
 */

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export function peso(amount: number): string {
  return pesoFormatter.format(amount);
}

/** Same as `peso`, with an explicit sign. Used for the gap line on a statement. */
export function pesoDelta(amount: number): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${sign}${pesoFormatter.format(Math.abs(amount))}`;
}
