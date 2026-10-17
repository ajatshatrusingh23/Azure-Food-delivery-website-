'use client';

import { Search, Store, UtensilsCrossed } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { cx } from '@/lib/format';

interface Suggestion {
  type: 'restaurant' | 'dish';
  id: string;
  label: string;
  sublabel: string;
  slug: string;
}

const DEBOUNCE_MS = 250;

/**
 * Type-ahead search. Two details matter:
 *  - debounce: wait until typing pauses instead of calling the API on every keystroke;
 *  - AbortController: cancel the previous request, so a slow response for "bir" can never
 *    arrive after (and overwrite) the response for "biryani".
 */
export function SearchBox({ initial = '', autoFocus = false, large = false }: { initial?: string; autoFocus?: boolean; large?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [fuzzy, setFuzzy] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await api.get<{ matchType: string; suggestions: Suggestion[] }>(`/search/suggest?q=${encodeURIComponent(term)}`, controller.signal);
        setItems(data.suggestions);
        setFuzzy(data.matchType === 'fuzzy');
        setActive(-1);
      } catch {
        /* aborted or failed: keep the previous list */
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const go = (s?: Suggestion) => {
    setOpen(false);
    if (s) router.push(`/restaurants/${s.slug}`);
    else if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div ref={box} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(items[active]);
        }}
        className={cx('flex items-center gap-2 rounded-2xl border border-line bg-surface shadow-sm focus-within:border-brand', large ? 'px-4 py-3.5' : 'px-3 py-2')}
      >
        <Search className="size-5 text-muted" aria-hidden />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActive((i) => Math.min(items.length - 1, i + 1));
            if (e.key === 'ArrowUp') setActive((i) => Math.max(-1, i - 1));
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Search for biryani, dosa, pizza or a restaurant"
          aria-label="Search restaurants and dishes"
          aria-expanded={open && items.length > 0}
          aria-controls="search-suggestions"
          className={cx('w-full bg-transparent outline-none placeholder:text-muted', large && 'text-lg')}
        />
      </form>
      {open && items.length > 0 && (
        <ul id="search-suggestions" role="listbox" className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-xl">
          {fuzzy && <li className="px-4 py-1.5 text-xs text-muted">No exact match. Showing similar names:</li>}
          {items.map((s, i) => (
            <li key={`${s.type}-${s.id}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(s)}
                className={cx('flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2', i === active && 'bg-surface-2')}
              >
                {s.type === 'restaurant' ? <Store className="size-4 text-muted" aria-hidden /> : <UtensilsCrossed className="size-4 text-muted" aria-hidden />}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{s.label}</span>
                  <span className="block truncate text-xs text-muted">{s.sublabel}</span>
                </span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => go()} className="w-full px-4 py-2.5 text-left text-sm font-medium text-brand hover:bg-surface-2">
              See all results for “{q.trim()}”
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
