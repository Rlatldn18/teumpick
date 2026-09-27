import type { Order } from './data';
export type OrderEvent = {
  key: string;
  orderId: string;
  title: string;
  message: string;
};
export function orderEvents(
  orders: Order[],
  role: string,
  seen: Set<string>,
): OrderEvent[] {
  return orders.flatMap((o) => {
    let title = '',
      message = '';
    if (role === 'seller' && o.status === 0) {
      title = '새 주문이 들어왔어요';
      message = `${o.menuName ?? '메뉴'} ${o.qty}개 · ${o.total.toLocaleString('ko-KR')}원. 주문을 확인해 주세요.`;
    } else if (role === 'buyer' && o.status === 3) {
      title = '지금 픽업해 주세요!';
      message = `${o.shopName ?? '매장'}의 음식이 도착했어요. ${o.station}역 A존 ${String(o.locker).padStart(2, '0')}번 보관함에서 찾아가세요.`;
    } else if (
      role === 'buyer' &&
      o.status === 5 &&
      o.canceledBy === 'seller'
    ) {
      title = '매장에서 주문을 취소했어요';
      message = `${o.shopName ?? '매장'}의 ${o.menuName ?? '메뉴'} 주문이 취소됐어요. 주문 내역을 확인해 주세요.`;
    }
    const key = `${o.id}:${o.status}`;
    return title && !seen.has(key)
      ? [{ key, orderId: o.id, title, message }]
      : [];
  });
}
