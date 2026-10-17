import { randomBytes } from 'crypto';

/** "Dakshin Delights, HSR" -> "dakshin-delights-hsr-3f9a" (suffix keeps slugs unique). */
export const slugify = (text: string): string => {
  const base = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'restaurant'}-${randomBytes(2).toString('hex')}`;
};
