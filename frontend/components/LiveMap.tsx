import { Bike, Home, Store } from 'lucide-react';

interface Point {
  latitude: number;
  longitude: number;
}

/**
 * A small schematic map: restaurant, customer and the rider's latest position projected
 * onto the same box. (A production app would use map tiles; this keeps the demo dependency-free.)
 */
export function LiveMap({ restaurant, home, rider }: { restaurant: Point; home: Point; rider?: Point | null }) {
  const points = [restaurant, home, ...(rider ? [rider] : [])];
  const pad = 0.004;
  const minLat = Math.min(...points.map((p) => p.latitude)) - pad;
  const maxLat = Math.max(...points.map((p) => p.latitude)) + pad;
  const minLng = Math.min(...points.map((p) => p.longitude)) - pad;
  const maxLng = Math.max(...points.map((p) => p.longitude)) + pad;
  const x = (p: Point) => ((p.longitude - minLng) / (maxLng - minLng)) * 100;
  const y = (p: Point) => (1 - (p.latitude - minLat) / (maxLat - minLat)) * 100;

  const marker = (p: Point, icon: React.ReactNode, label: string, tone: string) => (
    <div
      className={`absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white shadow-lg transition-all duration-1000 ${tone}`}
      style={{ left: `${x(p)}%`, top: `${y(p)}%` }}
      title={label}
      aria-label={label}
    >
      {icon}
    </div>
  );

  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-line bg-[radial-gradient(circle_at_1px_1px,var(--line)_1px,transparent_0)] [background-size:18px_18px]">
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <line x1={x(restaurant)} y1={y(restaurant)} x2={x(home)} y2={y(home)} stroke="var(--brand)" strokeWidth="0.6" strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      {marker(restaurant, <Store className="size-4 text-white" />, 'Restaurant', 'bg-warn')}
      {marker(home, <Home className="size-4 text-white" />, 'Delivery address', 'bg-ink')}
      {rider && marker(rider, <Bike className="size-4 text-white" />, 'Delivery partner', 'bg-brand')}
    </div>
  );
}
