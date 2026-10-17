/** All amounts are integer paise. The client never sends prices: the server computes them. */
export const FREE_DELIVERY_THRESHOLD = 499_00; // ₹499
export const DELIVERY_FEE = 40_00; // ₹40
export const GST_PERCENT = 5; // GST on restaurant food in India

export interface PricedLine {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Pricing {
  itemsTotal: number;
  deliveryFee: number;
  taxes: number;
  total: number;
}

export const computePricing = (lines: Pick<PricedLine, 'price' | 'quantity'>[]): Pricing => {
  const itemsTotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const deliveryFee = itemsTotal === 0 || itemsTotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  // Integer maths, rounded half-up to the nearest paisa (no floating-point drift).
  const taxes = Math.floor((itemsTotal * GST_PERCENT + 50) / 100);
  return { itemsTotal, deliveryFee, taxes, total: itemsTotal + deliveryFee + taxes };
};
