import type { Cart, OrderLine } from './types';
export const cartKey = (station: string, shopId: string) =>
  `${station}:${shopId}`;
export function cartTotals(items: OrderLine[]) {
  return items.reduce(
    (sum, item) => ({
      qty: sum.qty + item.qty,
      total: sum.total + item.qty * item.unitPrice,
    }),
    { qty: 0, total: 0 },
  );
}
export function addCartItem(cart: Cart, item: OrderLine): Cart {
  const existing = cart.items.find((x) => x.menuId === item.menuId);
  if (existing && existing.unitPrice !== item.unitPrice)
    throw new Error(
      '담아 둔 메뉴의 가격이 변경됐어요. 장바구니에서 가격을 확인해 주세요.',
    );
  if (
    item.qty < 1 ||
    !Number.isInteger(item.qty) ||
    (existing?.qty ?? 0) + item.qty > 10
  )
    throw new Error('같은 메뉴는 최대 10개까지 담을 수 있어요.');
  if (cartTotals(cart.items).qty + item.qty > 50)
    throw new Error('한 주문에는 총 50개까지 담을 수 있어요.');
  return {
    ...cart,
    requestId: crypto.randomUUID(),
    items: existing
      ? cart.items.map((x) =>
          x.menuId === item.menuId ? { ...x, qty: x.qty + item.qty } : x,
        )
      : [...cart.items, item],
  };
}
