'use client';
/* eslint-disable next/no-img-element, next/no-html-link-for-pages -- Remote images use pre-sized CDN URLs; full navigation resets the workspace. */
/* eslint-disable react/react-compiler -- The scaffold has no React Compiler; callbacks handle timestamps and async state synchronization. */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ShoppingBag,
  Store,
  MapPin,
  Clock3,
  ArrowRight,
  ArrowUpRight,
  Search,
  PackageCheck,
  LayoutGrid,
  Receipt,
  Plus,
  Minus,
  X,
  Check,
  Box,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { shops as sampleShops, statuses, won, type Order } from './data';
import { api } from './api-client';
import type { Member, Shop } from './types';
import AccountPanel, { MerchantPanel } from './account-panel';
import { App as NativeApp } from '@capacitor/app';
import { native } from './api-client';
import Modal from './modal';
import { orderEvents, type OrderEvent } from './order-events';
import { koreaDate, salesRange, type SalesPeriod } from './sales-period';
const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;
export default function Dashboard({
  role,
  demo,
  name,
  member,
  exit,
}: {
  role: string;
  setRole: (r: string) => void;
  demo: boolean;
  name: string;
  member: Member | null;
  exit: () => void;
}) {
  const [station, setStation] = useState('신도림'),
    [tab, setTab] = useState('shops'),
    [category, setCategory] = useState('전체'),
    [query, setQuery] = useState(''),
    [orders, setOrders] = useState<Order[]>([]),
    [selected, setSelected] = useState<Shop | null>(null),
    [qty, setQty] = useState(1),
    [note, setNote] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [now, setNow] = useState(() => Date.now()),
    [filter, setFilter] = useState('진행 중'),
    [code, setCode] = useState(''),
    [collect, setCollect] = useState<Order | null>(null),
    [sellerShop] = useState('all');
  const [visiting, setVisiting] = useState<Shop | null>(null);
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [period, setPeriod] = useState<SalesPeriod>('day');
  const [salesDate, setSalesDate] = useState(() => koreaDate(Date.now()));
  const seen = useRef(new Set<string>());
  const eventStorage = 'teumpick-events-' + (member?.id ?? 'guest');
  const fetchRun = useRef(0);
  useEffect(() => {
    try {
      seen.current = new Set(
        JSON.parse(localStorage.getItem(eventStorage) ?? '[]'),
      );
    } catch {}
  }, [eventStorage]);
  const [shops, setShops] = useState<Shop[]>(demo ? sampleShops : []);
  const [catalogLoading, setCatalogLoading] = useState(!demo);
  const requestId = useRef(crypto.randomUUID());
  const [lockerStates, setLockerStates] = useState<
    { locker: number; status: number }[]
  >([]);
  const loadCatalog = useCallback(async () => {
    if (demo) return;
    try {
      setShops(await api<Shop[]>('catalog'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCatalogLoading(false);
    }
  }, [demo]);
  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);
  useEffect(() => {
    if (demo) return;
    void api<{ locker: number; status: number }[]>(
      'lockers?station=' + encodeURIComponent(station),
    )
      .then(setLockerStates)
      .catch(() => {});
  }, [demo, station, orders]);
  useEffect(() => {
    if (!native()) return;
    const sub = NativeApp.addListener('backButton', () => {
      if (selected) setSelected(null);
      else if (collect) setCollect(null);
      else if (cancelOrder) setCancelOrder(null);
      else if (visiting) setVisiting(null);
      else if (tab !== 'shops') setTab('shops');
      else void NativeApp.minimizeApp();
    });
    return () => {
      void sub.then((s) => s.remove());
    };
  }, [tab, selected, collect, cancelOrder, visiting]);
  const mutation = useRef(false);
  const refresh = useCallback(async () => {
    if (demo) return;
    try {
      const run = ++fetchRun.current;
      const next = await api<Order[]>('orders');
      if (run !== fetchRun.current) return;
      setOrders(next);
      const fresh = orderEvents(next, role, seen.current);
      setEvents(fresh);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [demo, role]);
  useEffect(() => {
    void refresh();
    const t = setInterval(() => {
      setNow(Date.now());
      void refresh();
    }, 5000);
    const resume = () => {
      if (!document.hidden) {
        void refresh();
        void loadCatalog();
      }
    };
    document.addEventListener('visibilitychange', resume);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [refresh, loadCatalog]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!selected && !collect) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !mutation.current) {
        setSelected(null);
        setCollect(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selected, collect]);
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => void;
        };
      }
    ).modelContext;
    if (!context) return;
    const life = new AbortController();
    try {
      context.registerTool(
        {
          name: 'start_menu_order',
          description:
            'Open a sample store menu for review. Does not place an order.',
          inputSchema: {
            type: 'object',
            properties: { shopId: { type: 'string' } },
            required: ['shopId'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: (input: unknown) => {
            const id = (input as { shopId?: string })?.shopId;
            const shop = shops.find(
              (s) => s.id === id && s.stations.includes(station),
            );
            if (!shop) throw new Error('Store unavailable at selected station');
            setVisiting(shop);
            setQty(1);
            setNote('');
            return { opened: true, shopId: id };
          },
        },
        { signal: life.signal },
      );
    } catch {}
    return () => life.abort();
  }, [station, shops]);
  async function act(payload: Record<string, unknown>) {
    if (mutation.current) return;
    if (demo) {
      setSelected(null);
      setNotice('주문하려면 구매자 회원가입이 필요해요.');
      setTab('account');
      return;
    }
    mutation.current = true;
    setBusy(true);
    setError('');
    try {
      if (demo) {
        if (payload.action === 'create') {
          const shop = shops.find((s) => s.id === payload.shopId)!;
          const locker = Array.from({ length: 12 }, (_, i) => i + 1).find(
            (n) =>
              !orders.some(
                (o) => o.station === station && o.locker === n && o.status < 4,
              ),
          );
          if (!locker)
            throw new Error(
              '보관함이 모두 사용 중이에요. 다른 역을 선택해 주세요.',
            );
          const order: Order = {
            id: crypto.randomUUID(),
            shopId: shop.id,
            station,
            qty,
            total: shop.price * qty,
            status: 0,
            locker,
            created: Date.now(),
            eta: Date.now() + shop.minutes * 60000,
            note,
            code: String(Math.floor(100000 + Math.random() * 900000)),
            ready: null,
          };
          setOrders((prev) => [order, ...prev]);
        } else {
          const o = orders.find((o) => o.id === payload.id);
          if (!o) throw new Error('주문을 찾을 수 없습니다.');
          if (
            payload.action === 'collect' &&
            (o.status !== 3 || payload.code !== o.code)
          )
            throw new Error('수령 코드 6자리를 확인해 주세요.');
          setOrders((prev) =>
            prev.map((item) =>
              item.id !== o.id
                ? item
                : payload.action === 'delay'
                  ? { ...item, eta: item.eta + 300000 }
                  : {
                      ...item,
                      status:
                        payload.action === 'cancel'
                          ? 5
                          : payload.action === 'collect'
                            ? 4
                            : item.status + 1,
                      ready:
                        payload.action === 'next' && item.status === 2
                          ? Date.now()
                          : item.ready,
                    },
            ),
          );
        }
      } else {
        await api('orders', {
          ...payload,
          ...(payload.action === 'create'
            ? { requestId: requestId.current }
            : {}),
        });
        if (payload.action === 'create')
          requestId.current = crypto.randomUUID();
        await refresh();
      }
      if (payload.action === 'create') {
        setSelected(null);
        setVisiting(null);
        setTab('orders');
        setNotice('주문 완료! 보관함이 배정되었어요.');
      } else {
        setCollect(null);
        setCancelOrder(null);
        setCode('');
        setNotice(
          payload.action === 'collect'
            ? '수령 완료! 맛있게 드세요.'
            : '주문 정보가 업데이트되었어요.',
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  const active = orders.filter((o) => o.status < 4),
    sellerOrders = orders.filter(
      (o) => sellerShop === 'all' || o.shopId === sellerShop,
    );
  const range = salesRange(salesDate, period);
  const periodOrders = sellerOrders.filter(
    (o) => o.created >= range.start && o.created < range.end && o.status !== 5,
  );
  const periodName = { day: '일', week: '주', month: '월', year: '년' }[period];
  const store = visiting ? shops.find((s) => s.id === visiting.id) : null;
  const storeMenus =
    store?.menus ??
    (store
      ? [
          {
            id: 'legacy',
            name: store.menu,
            price: store.price,
            description: store.desc,
            group: '메인 메뉴',
            available: true,
          },
        ]
      : []);
  function dismissEvent() {
    if (!events[0]) return;
    seen.current.add(events[0].key);
    try {
      localStorage.setItem(
        eventStorage,
        JSON.stringify([...seen.current].slice(-500)),
      );
    } catch {}
    setEvents((e) => e.slice(1));
  }
  const visibleShops = shops.filter(
    (s) =>
      s.stations.includes(station) &&
      (category === '전체' || s.category === category) &&
      (s.name + s.menu + (s.menus ?? []).map((m) => m.name).join(' ')).includes(
        query,
      ),
  );
  const remaining = (o: Order) => Math.max(0, Math.ceil((o.eta - now) / 60000));
  const viewOrders =
    role === 'seller'
      ? sellerOrders.filter(
          (o) =>
            filter === '전체' ||
            (filter === '진행 중'
              ? o.status < 4
              : filter === '수령 완료'
                ? o.status === 4
                : o.status === 5),
        )
      : orders;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="/" className="brand">
          <span className="brand-icon">
            <ShoppingBag size={22} />
          </span>
          틈픽
        </a>
        <div className="workspace-label">
          {role === 'buyer' ? 'BUYER SPACE' : 'PARTNER SPACE'}
        </div>
        <nav>
          <button
            className={(tab === 'shops' ? 'active ' : '') + 'nav-item'}
            onClick={() => setTab('shops')}
          >
            {role === 'buyer' ? <Store size={20} /> : <LayoutGrid size={20} />}{' '}
            {role === 'buyer' ? '주변 가게' : '대시보드'}
          </button>
          <button
            className={(tab === 'orders' ? 'active ' : '') + 'nav-item'}
            onClick={() => setTab('orders')}
          >
            <Receipt size={20} />
            {role === 'buyer' ? '내 주문' : '주문 관리'}
            <span className="nav-count">{active.length}</span>
          </button>
          <button
            className={
              (tab === (role === 'seller' ? 'merchant' : 'lockers')
                ? 'active '
                : '') + 'nav-item'
            }
            onClick={() => setTab(role === 'seller' ? 'merchant' : 'lockers')}
          >
            {role === 'seller' ? <Store size={20} /> : <Box size={20} />}{' '}
            {role === 'seller' ? '내 매장' : '픽업존'}
          </button>
          <button
            className={(tab === 'account' ? 'active ' : '') + 'nav-item'}
            onClick={() => setTab('account')}
          >
            <UserRound size={20} />
            마이
          </button>
        </nav>
      </aside>
      <div className="app-body">
        <header className="app-header">
          <div className="location-select">
            <MapPin size={19} />
            <select
              aria-label="픽업 역 선택"
              value={station}
              onChange={(e) => {
                setStation(e.target.value);
                setVisiting(null);
                setSelected(null);
              }}
            >
              <option value="신도림">신도림역</option>
              <option value="영등포">영등포역</option>
            </select>
            <span className="line-badge">1</span>
            {station === '신도림' && (
              <span className="line-badge line2">2</span>
            )}
          </div>
          <div className="user-chip">
            <span className="user-avatar">
              {role === 'buyer' ? '구' : '판'}
            </span>
            <span>
              {role === 'buyer' ? '구매자' : '판매자'}
              <small>{demo ? '둘러보기' : name}</small>
            </span>
          </div>
        </header>
        <div className="demo-strip">
          {demo
            ? '게스트 체험 · 주문은 새로고침하면 초기화됩니다.'
            : '시험 운영 · 결제와 실제 보관함은 연결 전입니다.'}
          <span>실제 결제·보관함 연동 전</span>
        </div>
        <main className="workspace">
          {tab === 'account' && <AccountPanel member={member} exit={exit} />}
          {tab === 'merchant' && role === 'seller' && (
            <MerchantPanel
              onSaved={() => {
                void loadCatalog();
                setNotice('매장 정보를 저장했어요.');
              }}
            />
          )}
          {demo && (
            <button className="guest-join" onClick={exit}>
              내 주문을 저장하려면 회원가입하세요 <ArrowRight size={16} />
            </button>
          )}

          {error && (
            <div className="error" role="alert">
              {error}
              <button
                onClick={() => {
                  setError('');
                  void refresh();
                }}
              >
                다시 확인
              </button>
            </div>
          )}
          {role === 'buyer' && tab === 'shops' && !visiting && (
            <>
              <section className="welcome">
                <div>
                  <div className="section-kicker">ON YOUR WAY HOME</div>
                  <h1>오늘의 한 끼, 환승길에 픽업.</h1>
                  <p>기다림은 줄이고, 맛있는 일상은 챙기세요.</p>
                </div>
                <div className="zone-chip">
                  <PackageCheck size={22} />
                  <div>
                    스마트 픽업존
                    <strong>
                      {station}역 A존 <span>예정</span>
                    </strong>
                  </div>
                </div>
              </section>
              <section className="feature-banner">
                <div>
                  <span className="badge-light">
                    가볍게 주문하고, 간편하게 픽업
                  </span>
                  <h2>
                    역 밖으로 돌아가지 않아도
                    <br />
                    맛있는 한 끼가 기다려요.
                  </h2>
                  <p>
                    <Clock3 size={16} /> 메뉴별 준비 시간을 확인하세요
                  </p>
                </div>
                <img
                  src={photo('photo-1512621776951-a57141f2eefd')}
                  alt="신선한 채소와 재료를 담은 샐러드"
                />
                <span className="banner-stamp">
                  ORDER.
                  <br />
                  PICK UP.
                  <br />
                  GO.
                </span>
              </section>
              {active.length > 0 && (
                <button
                  className="active-order"
                  onClick={() => setTab('orders')}
                >
                  <span className="pulse" />
                  <strong>진행 중인 주문 {active.length}건</strong>
                  <span>보관함 번호와 준비 상태 확인</span>
                  <ArrowRight size={18} />
                </button>
              )}
              <div className="section-heading">
                <div>
                  <h2>
                    {station}역 주변 가게 <span>{visibleShops.length}</span>
                  </h2>
                  <p>
                    {demo
                      ? '메뉴와 가게를 미리 둘러보세요. 예시 가게입니다.'
                      : '지금 주문 접수 중인 가게예요.'}
                  </p>
                </div>
                <label className="search">
                  <Search size={18} />
                  <input
                    aria-label="가게 또는 메뉴 검색"
                    placeholder="가게, 메뉴 검색"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              <div className="categories">
                {['전체', '한식', '샐러드', '샌드위치', '커피·음료'].map(
                  (c) => (
                    <button
                      className={category === c ? 'selected' : ''}
                      key={c}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ),
                )}
              </div>
              <div className="shop-grid">
                {visibleShops.map((s) => (
                  <button
                    className="shop-card"
                    key={s.id}
                    onClick={() => {
                      setVisiting(s);
                      void loadCatalog();
                      setQty(1);
                      setNote('');
                      setError('');
                    }}
                  >
                    <div className="shop-photo">
                      <img src={photo(s.image)} alt={s.menu} loading="lazy" />
                      <span>{s.tag} · 예시 이미지</span>
                      <div className="photo-arrow">
                        <ArrowUpRight size={20} />
                      </div>
                    </div>
                    <div className="shop-info">
                      <div className="shop-title">
                        <h3>{s.name}</h3>
                        <span>{s.category}</span>
                      </div>
                      <p>{s.desc}</p>
                      <div className="shop-meta">
                        <span>
                          <Clock3 size={15} />
                          {s.minutes}분 후 픽업 예상
                        </span>
                        <strong>{won(s.price)}부터</strong>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {!visibleShops.length && (
                <div className="empty">
                  {catalogLoading
                    ? '주변 가게를 불러오고 있어요…'
                    : query || category !== '전체'
                      ? '검색 결과가 없어요.'
                      : '아직 주문 접수 중인 가게가 없어요.'}
                  <button
                    className="secondary"
                    onClick={() => {
                      setQuery('');
                      setCategory('전체');
                    }}
                  >
                    필터 초기화
                  </button>
                </div>
              )}
            </>
          )}
          {role === 'buyer' && tab === 'shops' && visiting && (
            <section className="store-menu-page">
              <button className="secondary" onClick={() => setVisiting(null)}>
                ← 주변 가게
              </button>
              <div className="store-menu-heading">
                <h1>{visiting.name}</h1>
                <p className="muted">{store?.desc ?? visiting.desc}</p>
                <p>
                  <Clock3 size={16} /> 약 {store?.minutes ?? visiting.minutes}분
                  후 픽업 · {station}역
                </p>
              </div>
              {!store && (
                <div className="empty">
                  지금은 주문을 접수하지 않는 매장이에요.
                </div>
              )}
              {[...new Set(storeMenus.map((m) => m.group))].map((group) => (
                <section className="menu-group" key={group}>
                  <h2>{group}</h2>
                  {storeMenus
                    .filter((m) => m.group === group)
                    .map((menu) => (
                      <button
                        key={menu.id}
                        className="store-menu-item"
                        disabled={!menu.available}
                        onClick={() => {
                          if (!store) return;
                          setSelected({
                            ...store,
                            menuId: menu.id,
                            menu: menu.name,
                            desc: menu.description,
                            price: menu.price,
                          });
                          setQty(1);
                          setNote('');
                          setError('');
                          requestId.current = crypto.randomUUID();
                        }}
                      >
                        <div>
                          <h3>{menu.name}</h3>
                          <p>{menu.description}</p>
                          <strong>{won(menu.price)}</strong>
                        </div>
                        <span>{menu.available ? '메뉴 선택 →' : '품절'}</span>
                      </button>
                    ))}
                </section>
              ))}
            </section>
          )}
          {role === 'seller' && tab === 'shops' && (
            <>
              <div className="section-heading">
                <div>
                  <div className="section-kicker">PARTNER OVERVIEW</div>
                  <h1>오늘도, 맛있는 연결.</h1>
                  <p>접수된 주문을 확인하고 픽업존 입고까지 관리하세요.</p>
                </div>
                <button
                  className="secondary"
                  onClick={() => setTab('merchant')}
                >
                  <Store size={17} />내 매장 관리
                </button>
              </div>
              <div className="sales-controls">
                <div className="categories" aria-label="매출 조회 기간">
                  {(['day', 'week', 'month', 'year'] as SalesPeriod[]).map(
                    (p) => (
                      <button
                        key={p}
                        className={period === p ? 'selected' : ''}
                        aria-pressed={period === p}
                        onClick={() => setPeriod(p)}
                      >
                        {{ day: '일', week: '주', month: '월', year: '년' }[p]}
                      </button>
                    ),
                  )}
                </div>
                <label>
                  기준 날짜
                  <input
                    aria-label="매출 기준 날짜"
                    type="date"
                    value={salesDate}
                    onChange={(e) => {
                      if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))
                        setSalesDate(e.target.value);
                    }}
                  />
                </label>
                <p className="muted">
                  {range.label} · 한국 시간 기준 · 주간은 월~일
                </p>
              </div>
              <div className="stats">
                <article>
                  <span>
                    <TrendingUp size={18} />
                    {periodName}간 주문 금액
                  </span>
                  <strong>
                    {won(periodOrders.reduce((s, o) => s + o.total, 0))}
                  </strong>
                  <small>취소 제외 · 실제 결제 매출 아님</small>
                </article>
                <article>
                  <span>
                    <Receipt size={18} />
                    {periodName}간 주문
                  </span>
                  <strong>
                    {periodOrders.length}
                    <small>건</small>
                  </strong>
                  <small>한국 시간 기준</small>
                </article>
                <article>
                  <span>
                    <Clock3 size={18} />
                    처리할 주문
                  </span>
                  <strong>
                    {sellerOrders.filter((o) => o.status < 3).length}
                    <small>건</small>
                  </strong>
                  <small>접수 · 준비 · 이동</small>
                </article>
                <article>
                  <span>
                    <PackageCheck size={18} />
                    수령 대기
                  </span>
                  <strong>
                    {sellerOrders.filter((o) => o.status === 3).length}
                    <small>건</small>
                  </strong>
                  <small>픽업존 입고 완료</small>
                </article>
              </div>
              <div className="operations-note">
                <PackageCheck />
                <div>
                  <strong>
                    음식을 보관함에 넣은 뒤 ‘입고 완료’를 눌러주세요.
                  </strong>
                  <p>구매자에게 픽업 가능 상태와 수령 코드가 표시됩니다.</p>
                </div>
              </div>
            </>
          )}
          {(tab === 'orders' || (role === 'seller' && tab === 'shops')) && (
            <>
              <div className="section-heading">
                <div>
                  <h2>
                    {role === 'buyer' ? '내 주문' : '주문 현황'}{' '}
                    <span>{viewOrders.length}</span>
                  </h2>
                  <p>
                    {role === 'buyer'
                      ? '준비부터 수령까지, 여기서 확인하세요.'
                      : '요청 사항과 보관함 번호를 확인해 주세요.'}
                  </p>
                </div>
                {role === 'seller' && (
                  <select
                    aria-label="주문 상태 필터"
                    className="select"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    {['진행 중', '전체', '수령 완료', '취소'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="orders-list">
                {viewOrders.map((o) => {
                  const s = {
                    name:
                      o.shopName ??
                      shops.find((s) => s.id === o.shopId)?.name ??
                      '매장',
                    menu:
                      o.menuName ??
                      shops.find((s) => s.id === o.shopId)?.menu ??
                      '메뉴',
                    image:
                      o.image ??
                      shops.find((s) => s.id === o.shopId)?.image ??
                      sampleShops[0].image,
                  };
                  return (
                    <article className="order-card" key={o.id}>
                      <div className="order-top">
                        <span className={'status status-' + o.status}>
                          {statuses[o.status]}
                        </span>
                        <span>
                          {new Date(o.created).toLocaleString('ko-KR', {
                            timeZone: 'Asia/Seoul',
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          · #{o.id.slice(0, 6).toUpperCase()}
                        </span>
                      </div>
                      <div className="order-main">
                        <img src={photo(s.image)} alt={s.menu} />
                        <div>
                          <p className="muted">{s.name}</p>
                          <h3>
                            {s.menu} <span>× {o.qty}</span>
                          </h3>
                          <strong>{won(o.total)}</strong>
                        </div>
                        <div className="locker-number">
                          <span>{o.station}역 A존</span>
                          <strong>
                            {String(o.locker).padStart(2, '0')}
                            <small>번</small>
                          </strong>
                        </div>
                      </div>
                      {o.note && (
                        <div className="order-note">요청 사항: {o.note}</div>
                      )}
                      {o.status < 5 && (
                        <div className="progress-track">
                          {statuses.slice(0, 5).map((st, i) => (
                            <div
                              className={i <= o.status ? 'done' : ''}
                              key={st}
                            >
                              <span>
                                {i < o.status ? <Check size={12} /> : i + 1}
                              </span>
                              <small>{st}</small>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="order-bottom">
                        <div>
                          {o.status < 3 ? (
                            <span className="eta">
                              <Clock3 size={16} />
                              {remaining(o) > 0
                                ? `약 ${remaining(o)}분 후 픽업 예상`
                                : '예상 시간이 지났어요 · 준비 상태 확인 중'}
                            </span>
                          ) : o.status === 3 ? (
                            <span className="eta green">
                              <PackageCheck size={17} />
                              지금 픽업할 수 있어요
                              {role === 'buyer' && <b>수령 코드 {o.code}</b>}
                            </span>
                          ) : (
                            <span className="muted">
                              {o.status === 4
                                ? '수령이 완료되었어요.'
                                : '취소된 주문입니다.'}
                            </span>
                          )}
                        </div>
                        <div className="order-actions">
                          {role === 'seller' && o.status < 3 && (
                            <>
                              <button
                                className="secondary"
                                disabled={busy}
                                onClick={() =>
                                  act({ action: 'delay', id: o.id })
                                }
                              >
                                +5분
                              </button>
                              <button
                                className="primary"
                                disabled={busy}
                                onClick={() =>
                                  act({ action: 'next', id: o.id })
                                }
                              >
                                {
                                  [
                                    '접수 · 준비 시작',
                                    '픽업존으로 출발',
                                    '입고 완료',
                                  ][o.status]
                                }
                                <ArrowRight size={15} />
                              </button>
                            </>
                          )}
                          {((role === 'buyer' && o.status === 0) ||
                            (role === 'seller' && o.status < 3)) && (
                            <button
                              className="secondary"
                              disabled={busy}
                              onClick={() => setCancelOrder(o)}
                            >
                              주문 취소
                            </button>
                          )}
                          {role === 'buyer' && o.status === 3 && (
                            <button
                              className="primary"
                              onClick={() => {
                                setCollect(o);
                                setCode('');
                                setError('');
                              }}
                            >
                              수령 확인 <ArrowRight size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              {!viewOrders.length && (
                <div className="empty">
                  <ShoppingBag size={38} />
                  <h3>
                    {role === 'buyer'
                      ? '아직 주문한 메뉴가 없어요'
                      : '표시할 주문이 없어요'}
                  </h3>
                  <p>
                    {role === 'buyer'
                      ? '역 주변 가게에서 오늘의 한 끼를 골라보세요.'
                      : '내 매장에 들어온 주문이 여기에 표시됩니다.'}
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      setTab(role === 'seller' ? 'merchant' : 'shops');
                    }}
                  >
                    {role === 'seller' ? '내 매장 등록하기' : '가게 둘러보기'}{' '}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
          {tab === 'lockers' && (
            <>
              <div className="section-kicker">SMART PICKUP ZONE</div>
              <h1>{station}역 A존</h1>
              <p className="muted">
                환승 동선 인근 설치 예정 · 위치와 보관함은 시뮬레이션입니다.
              </p>
              <div className="locker-layout">
                <section className="locker-panel">
                  <div className="section-heading">
                    <h2>보관함 현황</h2>
                    <span className="muted">총 12칸</span>
                  </div>
                  <div className="locker-grid">
                    {Array.from({ length: 12 }, (_, i) => {
                      const o = demo
                        ? active.find(
                            (o) => o.station === station && o.locker === i + 1,
                          )
                        : lockerStates.find((o) => o.locker === i + 1);
                      return (
                        <div
                          className={
                            o ? (o.status === 3 ? 'ready' : 'reserved') : ''
                          }
                          key={i}
                        >
                          <Box size={21} />
                          <strong>{String(i + 1).padStart(2, '0')}</strong>
                          <small>
                            {o
                              ? o.status === 3
                                ? '픽업 가능'
                                : '예약됨'
                              : '사용 가능'}
                          </small>
                        </div>
                      );
                    })}
                  </div>
                </section>
                <section className="pickup-guide">
                  <h2>이렇게 픽업하세요</h2>
                  {[
                    '내 주문에서 입고 완료 확인',
                    '선택한 역 A존과 보관함 번호 확인',
                    '수령 코드를 확인하고 음식 수령',
                  ].map((s, i) => (
                    <div key={s}>
                      <b>{i + 1}</b>
                      <p>{s}</p>
                    </div>
                  ))}
                  <p className="guide-note">
                    실제 설치 위치와 운영 시간은 확정 전입니다. 이 앱에서 실제
                    보관함 문이 열리지는 않아요.
                  </p>
                </section>
              </div>
            </>
          )}
        </main>
        <footer className="app-footer">
          © 2026 TEUMPICK<span>일상과 맛집 사이, 짧은 틈.</span>
        </footer>
      </div>
      {notice && (
        <output className="toast">
          <Check size={18} />
          {notice}
        </output>
      )}
      {cancelOrder && (
        <Modal
          label="cancel-title"
          onClose={() => {
            if (!busy) setCancelOrder(null);
          }}
        >
          <section className="modal compact">
            <h2 id="cancel-title">정말 주문을 취소할까요?</h2>
            <p>
              {cancelOrder.menuName} · {won(cancelOrder.total)}
            </p>
            <p className="muted">
              {role === 'seller'
                ? '취소하면 구매자에게 알림이 표시돼요.'
                : '취소 후에는 되돌릴 수 없어요.'}
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button
              className="secondary full"
              disabled={busy}
              onClick={() => setCancelOrder(null)}
            >
              주문 유지하기
            </button>
            <button
              className="danger-button full"
              disabled={busy}
              onClick={() => void act({ action: 'cancel', id: cancelOrder.id })}
            >
              {busy ? '취소 중…' : '주문 취소하기'}
            </button>
          </section>
        </Modal>
      )}
      {events.length > 0 && !selected && !collect && !cancelOrder && (
        <Modal label="event-title" onClose={dismissEvent}>
          <section className="modal compact">
            <PackageCheck size={32} className="green" />
            <h2 id="event-title">{events[0].title}</h2>
            <p>{events[0].message}</p>
            <button
              className="primary full"
              onClick={() => {
                dismissEvent();
                setTab('orders');
                setFilter('전체');
                setVisiting(null);
              }}
            >
              주문 확인하기
            </button>
            <button className="secondary full" onClick={dismissEvent}>
              확인
            </button>
          </section>
        </Modal>
      )}
      {selected && (
        <Modal
          label="menu-title"
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <section className="modal">
            <button
              className="close-modal"
              aria-label="닫기"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              <X />
            </button>
            <img
              className="modal-photo"
              src={photo(selected.image)}
              alt={selected.menu}
            />
            <div className="modal-content">
              <p className="section-kicker">
                {selected.name} · {station}역 픽업
              </p>
              <h2 id="menu-title">{selected.menu}</h2>
              <p className="muted">{selected.desc}</p>
              <div className="menu-price">
                <strong>{won(selected.price)}</strong>
                <span>
                  <Clock3 size={16} />
                  {selected.minutes}분 후 픽업 예상
                </span>
              </div>
              <div className="quantity-row">
                <strong>수량</strong>
                <div>
                  <button
                    aria-label="수량 줄이기"
                    disabled={qty === 1}
                    onClick={() => setQty((q) => q - 1)}
                  >
                    <Minus size={16} />
                  </button>
                  <span>{qty}</span>
                  <button
                    aria-label="수량 늘리기"
                    disabled={qty === 10}
                    onClick={() => setQty((q) => q + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <label className="note-label">
                가게에 요청할 내용
                <input
                  maxLength={200}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="예: 소스는 따로 담아 주세요"
                />
              </label>
              <div className="checkout-note">
                <MapPin size={17} />
                <span>{station}역 A존 · 주문 시 보관함 자동 배정</span>
              </div>
              <p className="muted">시범 주문으로 실제 결제되지 않습니다.</p>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="primary full"
                disabled={busy}
                onClick={() =>
                  act({
                    action: 'create',
                    shopId: selected.id,
                    menuId: selected.menuId,
                    unitPrice: selected.price,
                    station,
                    qty,
                    note,
                  })
                }
              >
                {busy
                  ? '주문 처리 중…'
                  : `${won(selected.price * qty)} · 시범 주문하기`}
                <ArrowRight size={17} />
              </button>
            </div>
          </section>
        </Modal>
      )}
      {collect && (
        <Modal
          label="collect-title"
          onClose={() => {
            if (!busy) setCollect(null);
          }}
        >
          <form
            className="modal compact"
            onSubmit={(e) => {
              e.preventDefault();
              void act({ action: 'collect', id: collect.id, code });
            }}
          >
            <button
              type="button"
              className="close-modal"
              aria-label="닫기"
              disabled={busy}
              onClick={() => setCollect(null)}
            >
              <X />
            </button>
            <PackageCheck className="green" size={35} />
            <h2 id="collect-title">음식을 받으셨나요?</h2>
            <p>
              {collect.station}역 A존{' '}
              <strong>{String(collect.locker).padStart(2, '0')}번</strong>{' '}
              보관함
            </p>
            <p className="muted">
              내 주문의 수령 코드 6자리를 입력해 주세요.
              <br />
              실제 보관함 개방 없이 수령 상태만 변경됩니다.
            </p>
            <input
              required
              aria-label="수령 코드 6자리"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className="code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
            />
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button
              className="primary full"
              disabled={busy || code.length !== 6}
            >
              수령 완료하기
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
