import { Clock, Leaf } from 'lucide-react';
import Link from 'next/link';
import { cx, heroGradient, inr } from '@/lib/format';
import type { RestaurantCard as Restaurant } from '@/lib/types';
import { Rating } from './ui';

export function RestaurantCard({ r }: { r: Pick<Restaurant, 'name' | 'slug' | 'cuisines' | 'area' | 'priceForTwo' | 'avgDeliveryMins' | 'isOpen' | 'isPureVeg' | 'ratingAvg' | 'ratingCount' | 'imageHue'> }) {
  return (
    <Link href={`/restaurants/${r.slug}`} className="group block">
      <div
        className={cx('relative grid aspect-[16/10] place-items-center overflow-hidden rounded-2xl transition group-hover:scale-[0.98]', !r.isOpen && 'grayscale')}
        style={{ background: heroGradient(r.imageHue) }}
      >
        <span className="px-4 text-center text-2xl font-black tracking-tight text-white/90 drop-shadow-sm">{r.name}</span>
        {!r.isOpen && <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1.5 text-center text-xs font-semibold text-white">Currently closed</span>}
        {r.isPureVeg && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-veg">
            <Leaf className="size-3" aria-hidden /> Pure veg
          </span>
        )}
      </div>
      <div className="mt-2.5 px-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-bold">{r.name}</h3>
          <Rating value={r.ratingAvg} />
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-sm text-ink-2">
          <span className="truncate">{r.cuisines.join(', ')}</span>
          <span className="shrink-0 tabular">{inr(r.priceForTwo)} for two</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
          <Clock className="size-3.5" aria-hidden /> {r.avgDeliveryMins} min · {r.area}
        </div>
      </div>
    </Link>
  );
}
