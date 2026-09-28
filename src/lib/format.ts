export const CURRENCY_SYMBOL = "৳";

export function formatPrice(n: number | null | undefined, opts?: { decimals?: 0 | 2 }): string {
  const value = Number(n ?? 0);
  return `${CURRENCY_SYMBOL}${value.toFixed(opts?.decimals ?? 0)}`;
}
