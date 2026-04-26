/**
 * Pure utility functions — no client-side directives, no browser APIs.
 * Safe to import from both Next.js server routes (Node.js) and client components.
 */

/**
 * Normalises AI-generated currency strings to standard symbols.
 * e.g. "Euro 25" → "€25", "GBP 12.50" → "£12.50", "EUR15" → "€15"
 */
export function formatCurrency(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/Euros?\s*/gi, '€')
    .replace(/\bEUR\s*/gi, '€')
    .replace(/\bGBP\s*/gi, '£')
    .replace(/\bUSD\s*/gi, '$')
    .replace(/\bJPY\s*/gi, '¥')
    .replace(/€\s*\(\s*€\s*\)/g, '€')
    .replace(/£\s*\(\s*£\s*\)/g, '£')
    .replace(/\$\s*\(\s*\$\s*\)/g, '$')
    .replace(/¥\s*\(\s*¥\s*\)/g, '¥');
}
