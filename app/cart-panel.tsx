'use client';
import { Plus, Minus, X, ShoppingBag } from 'lucide-react';
import type { Cart, Shop } from './types';
import { cartTotals } from './cart';
import { won } from './data';
import Modal from './modal';
export default function CartPanel({
  cart,
  shop,
  busy,
  error,
  note,
  setNote,
  update,
  close,
  submit,
  reload,
}: {
  cart: Cart;
  shop?: Shop;
  busy: boolean;
  error: string;
  note: string;
  setNote: (value: string) => void;
  update: (cart: Cart) => void;
  close: () => void;
  submit: () => void;
  reload: () => void;
}) {
  const { qty, total } = cartTotals(cart.items);
  const menus =
    shop?.menus ??
    (shop
      ? [{ id: 'legacy', name: shop.menu, price: shop.price, available: true }]
      : []);
  const available = (id: string) =>
    menus.find((m) => m.id === id && m.available);
  const invalid =
    !shop ||
    !shop.stations.includes(cart.station) ||
    cart.items.some((item) => {
      const menu = available(item.menuId);
      return !menu || menu.price !== item.unitPrice;
    });
  function change(id: string, count: number) {
    update({
      ...cart,
      requestId: crypto.randomUUID(),
      items: cart.items
        .map((i) => (i.menuId === id ? { ...i, qty: count } : i))
        .filter((i) => i.qty > 0),
    });
  }
  return (
    <Modal
      label="cart-title"
      onClose={() => {
        if (!busy) close();
      }}
    >
      <section className="modal compact cart-modal">
        <button
          className="close-modal"
          aria-label="장바구니 닫기"
          disabled={busy}
          onClick={close}
        >
          <X />
        </button>
        <ShoppingBag size={28} className="green" />
        <h2 id="cart-title">장바구니</h2>
        <p>
          {cart.shopName} · {cart.station}역 픽업
        </p>
        {!cart.items.length && (
          <p className="empty">장바구니가 비었어요. 메뉴를 더 담아 주세요.</p>
        )}
        {cart.items.map((item) => {
          const menu = available(item.menuId);
          return (
            <article className="cart-line" key={item.menuId}>
              <div className="cart-line-heading">
                <h3>{item.name}</h3>
                <button
                  aria-label={`${item.name} 삭제`}
                  disabled={busy}
                  className="text-button"
                  onClick={() => change(item.menuId, 0)}
                >
                  삭제
                </button>
              </div>
              {!menu && (
                <p className="danger-text">
                  품절 또는 판매 종료 · 메뉴를 삭제해 주세요.
                </p>
              )}
              {menu && menu.price !== item.unitPrice && (
                <p className="danger-text">
                  가격이 {won(menu.price)}으로 변경됐어요.{' '}
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      update({
                        ...cart,
                        requestId: crypto.randomUUID(),
                        items: cart.items.map((i) =>
                          i.menuId === item.menuId
                            ? { ...i, unitPrice: menu.price, name: menu.name }
                            : i,
                        ),
                      })
                    }
                  >
                    변경된 가격 적용
                  </button>
                </p>
              )}
              <div className="quantity-row">
                <span>{won(item.unitPrice)} / 개</span>
                <div>
                  <button
                    aria-label={`${item.name} 수량 줄이기`}
                    disabled={busy || item.qty === 1}
                    onClick={() => change(item.menuId, item.qty - 1)}
                  >
                    <Minus size={16} />
                  </button>
                  <span>{item.qty}</span>
                  <button
                    aria-label={`${item.name} 수량 늘리기`}
                    disabled={busy || item.qty === 10 || qty >= 50}
                    onClick={() => change(item.menuId, item.qty + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <strong className="cart-line-total">
                {won(item.qty * item.unitPrice)}
              </strong>
            </article>
          );
        })}
        <button className="secondary full" disabled={busy} onClick={close}>
          메뉴 더 담기
        </button>
        {cart.items.length > 0 && (
          <>
            <label className="note-label">
              가게에 요청할 내용
              <input
                maxLength={200}
                value={note}
                disabled={busy}
                onChange={(e) => setNote(e.target.value)}
                placeholder="예: 음료 얼음은 적게 넣어 주세요"
              />
            </label>
            <div className="cart-total">
              <span>총 {qty}개 · 주문 합계</span>
              <strong>{won(total)}</strong>
            </div>
            <p className="muted">
              {shop ? `약 ${shop.minutes}분 후 픽업 예상 · ` : ''}보관함 1칸
              배정
              <br />
              시범 주문이며 실제 결제되지 않습니다.
            </p>
            {invalid && (
              <p className="error">
                매장 접수 상태와 변경된 메뉴를 확인해 주세요.
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="text-button" disabled={busy} onClick={reload}>
              최신 메뉴 정보 확인
            </button>
            <button
              className="primary full"
              disabled={busy || invalid}
              onClick={submit}
            >
              {busy ? '확인 중…' : `${won(total)} · 한 번에 시범 주문하기`}
            </button>
          </>
        )}
      </section>
    </Modal>
  );
}
