import { parseAsArrayOf, parseAsString } from "nuqs";

/**
 * The API uses cursor pagination (`cursor`, `limit`, `next_cursor`). The URL
 * keeps the stack of cursors for pages already visited so "Previous" works:
 * `?cursors=c1,c2` means we are on the page that starts at c2. Empty = page 1.
 */
export const cursorsParser = parseAsArrayOf(parseAsString).withDefault([]);

export const currentCursor = (cursors: readonly string[]): string | undefined =>
  cursors.length ? cursors[cursors.length - 1] : undefined;

export const pushCursor = (cursors: readonly string[], next: string) => [...cursors, next];
export const popCursor = (cursors: readonly string[]) => cursors.slice(0, -1);
