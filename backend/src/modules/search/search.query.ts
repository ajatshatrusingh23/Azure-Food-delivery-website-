/**
 * Turns free text into the pieces of a safe Postgres full-text query.
 *
 * - Only [a-z0-9] tokens survive, so user input can never inject tsquery operators
 *   (and every value is still passed as a bound SQL parameter).
 * - Finished words use the English dictionary (stemming: "noodles" matches "noodle").
 * - The last word may still be being typed, so it ALSO matches as a raw prefix in the
 *   'simple' dictionary. English stemming would turn "biry" into "biri:*", which does
 *   not match "biryani"; the simple prefix "biry:*" does.
 */
export interface ParsedSearch {
  text: string; // normalised text, used for trigram fuzzy matching
  head: string; // finished words joined with '&' (may be empty)
  last: string; // last word, for exact + prefix matching
}

const MAX_TOKENS = 6;

export const parseSearch = (raw: string): ParsedSearch | null => {
  const tokens = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_TOKENS);
  if (!tokens.length) return null;
  const last = tokens[tokens.length - 1]!;
  return { text: tokens.join(' '), head: tokens.slice(0, -1).join(' & '), last };
};
