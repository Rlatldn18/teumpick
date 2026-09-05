import { env } from 'cloudflare:workers';
import {
  digest,
  secret,
  hashPassword,
  verifyPassword,
  passwordValid,
} from './password';
import type { Member, MenuItem } from '../app/types';
const ORIGIN = 'https://platform-pick-sindorim.szmt-36.chatgpt.site';
const allowed = new Set([ORIGIN, 'https://localhost', 'capacitor://localhost']);
const COOKIE = 'teumpick_session';
const DAY = 86400000;
const clean = (v: unknown, max = 100) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function fail(status: number, message: string): never {
  throw new ApiError(status, message);
}
function db() {
  if (!env.DB)
    fail(503, '서버 연결을 준비 중입니다. 잠시 후 다시 시도해 주세요.');
  return env.DB;
}
function getToken(req: Request) {
  return (
    req.headers.get('authorization')?.replace(/^Bearer /, '') ??
    req.headers
      .get('cookie')
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(COOKIE + '='))
      ?.slice(COOKIE.length + 1) ??
    ''
  );
}
async function user(req: Request) {
  const token = getToken(req);
  if (!/^[a-f0-9]{64}$/.test(token)) fail(401, '다시 로그인해 주세요.');
  const member = await db()
    .prepare(
      'SELECT m.id,m.email,m.name,m.role,m.created FROM members m JOIN sessions s ON m.id=s.member_id WHERE s.hash=? AND s.expires>?',
    )
    .bind(digest(token), Date.now())
    .first<Member>();
  if (!member) fail(401, '로그인이 만료되었어요. 다시 로그인해 주세요.');
  return member;
}
async function rate(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const r = await db()
    .prepare(
      'INSERT INTO auth_attempts (key,count,reset) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset<? THEN 1 ELSE count+1 END,reset=CASE WHEN reset<? THEN excluded.reset ELSE reset END RETURNING count',
    )
    .bind(digest(key), now + windowMs, now, now)
    .first<{ count: number }>();
  if (r && r.count > max)
    fail(429, '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.');
}
async function loginSession(member: Member, req: Request) {
  const token = secret();
  await db().batch([
    db().prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()),
    db()
      .prepare('INSERT INTO sessions (hash,member_id,expires) VALUES (?,?,?)')
      .bind(digest(token), member.id, Date.now() + 7 * DAY),
  ]);
  return {
    user: member,
    ...(req.headers.get('x-teumpick-client') === 'android' ? { token } : {}),
    sessionToken: token,
  };
}
const shopSelect =
  'SELECT id,name,category,description AS desc,minutes,price,menu,image,station,open,menus FROM merchants';
const orderSelect =
  'SELECT id,buyer_id AS buyerId,seller_id AS sellerId,shop_id AS shopId,shop_name AS shopName,menu_name AS menuName,image,station,qty,total,status,locker,created,eta,note,code,ready,canceled_by AS canceledBy FROM pickup_orders';
const photoByCategory: Record<string, string> = {
  한식: 'photo-1547592180-85f173990554',
  샐러드: 'photo-1512621776951-a57141f2eefd',
  샌드위치: 'photo-1528735602780-2552fd46c7af',
  커피·음료: 'photo-1461023058943-07fcbe16d735',
};
function readMenus(shop: Record<string, unknown>): MenuItem[] {
  const parsed = JSON.parse(
    typeof shop.menus === 'string' ? shop.menus : '[]',
  ) as MenuItem[];
  return parsed.length
    ? parsed
    : shop.menu && Number(shop.price) > 0
      ? [
          {
            id: 'legacy',
            name: clean(shop.menu, 80),
            description: clean(shop.description ?? shop.desc, 200),
            group: '메인 메뉴',
            price: Number(shop.price),
            available: true,
          },
        ]
      : [];
}
function validateMenus(value: unknown): MenuItem[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50)
    fail(400, '메뉴를 1~50개 등록해 주세요.');
  const ids = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== 'object')
      fail(400, '메뉴 정보를 확인해 주세요.');
    const id = clean(item.id, 64),
      name = clean(item.name, 80),
      group = clean(item.group, 30);
    if (
      !/^[a-zA-Z0-9-]{1,64}$/.test(id) ||
      ids.has(id) ||
      !name ||
      !group ||
      !Number.isInteger(item.price) ||
      item.price < 100 ||
      item.price > 1000000 ||
      typeof item.available !== 'boolean'
    )
      fail(400, '메뉴 이름·분류·가격을 확인해 주세요.');
    ids.add(id);
    return {
      id,
      name,
      group,
      description: clean(item.description, 200),
      price: item.price,
      available: item.available,
    };
  });
}
export async function handle(req: Request) {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
  });
  const origin = req.headers.get('origin');
  const url = new URL(req.url);
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const accepted =
    origin && (allowed.has(origin) || (local && origin === url.origin));
  if (accepted) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Teumpick-Client',
    );
    headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
  if (req.method === 'OPTIONS')
    return new Response(null, { status: accepted ? 204 : 403, headers });
  try {
    if (origin && !accepted) fail(403, '허용되지 않은 요청입니다.');
    if (
      req.method === 'POST' &&
      !origin &&
      !req.headers.get('authorization') &&
      req.headers.get('x-teumpick-client') !== 'android'
    )
      fail(403, '허용되지 않은 요청입니다.');
    const path = url.pathname.replace('/api/mobile/', '');
    let b: Record<string, unknown> = {};
    if (req.method === 'POST') {
      const raw = await req.text();
      if (raw.length > 60000) fail(413, '입력 내용이 너무 깁니다.');
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object')
          throw Error();
        b = parsed;
      } catch {
        fail(400, '입력 내용을 확인해 주세요.');
      }
    }
    let result: unknown;
    const ip = req.headers.get('cf-connecting-ip') ?? 'local';
    if (path === 'auth/register' && req.method === 'POST') {
      await rate('register:' + ip, 8, 3600000);
      const email = clean(b.email, 254).toLowerCase(),
        name = clean(b.name, 40),
        role = b.role;
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        name.length < 2 ||
        !passwordValid(b.password) ||
        (role !== 'buyer' && role !== 'seller') ||
        b.acceptTerms !== true
      )
        fail(
          400,
          '이름, 이메일, 10자 이상 비밀번호와 필수 동의를 확인해 주세요.',
        );
      if (
        role === 'seller' &&
        (!clean(b.storeName, 60) ||
          !['신도림', '영등포'].includes(String(b.station)) ||
          clean(b.address, 150).length < 5)
      )
        fail(400, '매장명, 역, 매장 주소를 입력해 주세요.');
      if (
        await db()
          .prepare('SELECT id FROM members WHERE email=?')
          .bind(email)
          .first()
      )
        fail(
          409,
          '이미 사용 중인 이메일입니다. 로그인 또는 비밀번호 재설정을 이용해 주세요.',
        );
      const id = crypto.randomUUID(),
        recovery = secret(),
        created = Date.now(),
        password = await hashPassword(b.password);
      const statements = [
        db()
          .prepare(
            'INSERT INTO members (id,email,name,role,password,recovery,created,terms_version) VALUES (?,?,?,?,?,?,?,?)',
          )
          .bind(
            id,
            email,
            name,
            role,
            password,
            digest(recovery),
            created,
            '2026-09-05',
          ),
      ];
      if (role === 'seller')
        statements.push(
          db()
            .prepare(
              'INSERT INTO merchants (id,member_id,name,station,address,category,description,menu,price,minutes,image,open,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?)',
            )
            .bind(
              crypto.randomUUID(),
              id,
              clean(b.storeName, 60),
              String(b.station),
              clean(b.address, 150),
              '한식',
              '',
              '',
              0,
              15,
              photoByCategory['한식'],
              created,
            ),
        );
      try {
        await db().batch(statements);
      } catch (e) {
        if (String(e).includes('UNIQUE'))
          fail(409, '이미 사용 중인 이메일입니다.');
        throw e;
      }
      result = {
        ...(await loginSession({ id, email, name, role, created }, req)),
        recoveryCode: recovery,
      };
    } else if (path === 'auth/login' && req.method === 'POST') {
      const email = clean(b.email, 254).toLowerCase();
      await rate('login-ip:' + ip, 40, 900000);
      await rate('login-email:' + email, 12, 900000);
      if (typeof b.password !== 'string' || b.password.length > 128)
        fail(400, '이메일과 비밀번호를 확인해 주세요.');
      const row = await db()
        .prepare('SELECT * FROM members WHERE email=?')
        .bind(email)
        .first<Member & { password: string }>();
      if (!row || !(await verifyPassword(b.password, row.password)))
        fail(401, '이메일 또는 비밀번호가 일치하지 않습니다.');
      result = await loginSession(
        {
          id: row.id,
          email: row.email,
          name: row.name,
          role: row.role,
          created: row.created,
        },
        req,
      );
    } else if (path === 'auth/reset' && req.method === 'POST') {
      await rate('reset:' + ip, 8, 3600000);
      const email = clean(b.email, 254).toLowerCase();
      if (!passwordValid(b.password) || !clean(b.recoveryCode, 64))
        fail(400, '복구 코드와 새 비밀번호를 확인해 주세요.');
      const row = await db()
        .prepare('SELECT id,recovery FROM members WHERE email=?')
        .bind(email)
        .first<{ id: string; recovery: string }>();
      if (!row || digest(String(b.recoveryCode).trim()) !== row.recovery)
        fail(400, '이메일 또는 복구 코드가 일치하지 않습니다.');
      const recovery = secret();
      await db().batch([
        db()
          .prepare('UPDATE members SET password=?,recovery=? WHERE id=?')
          .bind(await hashPassword(b.password), digest(recovery), row.id),
        db().prepare('DELETE FROM sessions WHERE member_id=?').bind(row.id),
      ]);
      result = { ok: true, recoveryCode: recovery };
    } else if (path === 'auth/me' && req.method === 'GET') {
      result = { user: await user(req) };
    } else if (path === 'auth/logout' && req.method === 'POST') {
      await db()
        .prepare('DELETE FROM sessions WHERE hash=?')
        .bind(digest(getToken(req)))
        .run();
      headers.set(
        'Set-Cookie',
        `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; Secure`,
      );
      result = { ok: true };
    } else if (path === 'account/delete' && req.method === 'POST') {
      const m = await user(req);
      await rate('delete:' + m.id, 5, 900000);
      const row = await db()
        .prepare('SELECT password FROM members WHERE id=?')
        .bind(m.id)
        .first<{ password: string }>();
      if (
        typeof b.password !== 'string' ||
        b.password.length > 128 ||
        !row ||
        !(await verifyPassword(b.password, row.password))
      )
        fail(400, '비밀번호를 확인해 주세요.');
      // The transaction marks the account unavailable before removal. All order creation checks membership in its INSERT SELECT.
      const active = await db()
        .prepare(
          'SELECT id FROM pickup_orders WHERE (buyer_id=? OR seller_id=?) AND status<4 LIMIT 1',
        )
        .bind(m.id, m.id)
        .first();
      if (active)
        fail(409, '진행 중인 주문을 취소하거나 수령 완료한 뒤 탈퇴해 주세요.');
      const guard =
        'NOT EXISTS (SELECT 1 FROM pickup_orders WHERE (buyer_id=? OR seller_id=?) AND status<4)';
      const deleted = await db().batch([
        db()
          .prepare(`DELETE FROM members WHERE id=? AND ${guard}`)
          .bind(m.id, m.id, m.id),
        db()
          .prepare(
            'DELETE FROM sessions WHERE member_id=? AND NOT EXISTS(SELECT 1 FROM members WHERE id=?)',
          )
          .bind(m.id, m.id),
        db()
          .prepare(
            'DELETE FROM merchants WHERE member_id=? AND NOT EXISTS(SELECT 1 FROM members WHERE id=?)',
          )
          .bind(m.id, m.id),
        db()
          .prepare(
            "UPDATE pickup_orders SET buyer_id='deleted',note='' WHERE buyer_id=? AND NOT EXISTS(SELECT 1 FROM members WHERE id=?)",
          )
          .bind(m.id, m.id),
        db()
          .prepare(
            "UPDATE pickup_orders SET seller_id='deleted',note='' WHERE seller_id=? AND NOT EXISTS(SELECT 1 FROM members WHERE id=?)",
          )
          .bind(m.id, m.id),
      ]);
      if (!deleted[0].meta.changes)
        fail(409, '새 주문이 있어요. 주문을 처리한 뒤 다시 시도해 주세요.');
      headers.set(
        'Set-Cookie',
        `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; Secure`,
      );
      result = { ok: true };
    } else if (path === 'lockers' && req.method === 'GET') {
      const station = url.searchParams.get('station');
      if (!['신도림', '영등포'].includes(station ?? ''))
        fail(400, '역을 확인해 주세요.');
      const r = await db()
        .prepare(
          'SELECT locker,status FROM pickup_orders WHERE station=? AND status<4',
        )
        .bind(station)
        .all();
      result = r.results;
    } else if (path === 'catalog' && req.method === 'GET') {
      const rows = await db()
        .prepare(
          shopSelect +
            " WHERE open=1 AND price>0 AND menu<>'' ORDER BY created DESC",
        )
        .all<Record<string, unknown>>();
      result = rows.results.map((r) => ({
        ...r,
        stations: [r.station],
        tag: '픽업 주문',
        open: !!r.open,
        menus: readMenus(r),
      }));
    } else if (path === 'merchant') {
      const m = await user(req);
      if (m.role !== 'seller') fail(403, '판매자 계정만 접근할 수 있어요.');
      if (req.method === 'GET') {
        result = await db()
          .prepare('SELECT * FROM merchants WHERE member_id=?')
          .bind(m.id)
          .first<Record<string, unknown>>();
        if (result)
          result = {
            ...(result as Record<string, unknown>),
            menus: readMenus(result as Record<string, unknown>),
          };
      } else if (req.method === 'POST') {
        const previous = await db()
          .prepare('SELECT * FROM merchants WHERE member_id=?')
          .bind(m.id)
          .first<Record<string, unknown>>();
        if (b.menus === undefined && previous && readMenus(previous).length > 1)
          fail(409, '최신 앱에서 여러 메뉴를 관리해 주세요.');
        const menus = validateMenus(
          b.menus ?? [
            {
              id: 'legacy',
              name: b.menu,
              group: '메인 메뉴',
              description: b.description ?? '',
              price: b.price,
              available: true,
            },
          ],
        );
        const first = menus.find((x) => x.available) ?? menus[0];
        const minPrice = Math.min(
          ...menus.filter((x) => x.available).map((x) => x.price),
        );
        const name = clean(b.name, 60),
          menu = first.name,
          category = String(b.category),
          station = String(b.station);
        if (
          !name ||
          !menu ||
          !photoByCategory[category] ||
          !['신도림', '영등포'].includes(station) ||
          !Number.isInteger(b.minutes) ||
          Number(b.minutes) < 5 ||
          Number(b.minutes) > 120 ||
          clean(b.address, 150).length < 5
        )
          fail(400, '매장·메뉴·가격·준비 시간 정보를 확인해 주세요.');
        if (b.open === true && !menus.some((x) => x.available))
          fail(400, '판매 가능한 메뉴가 있어야 주문 접수를 켤 수 있어요.');
        await db()
          .prepare(
            'UPDATE merchants SET name=?,menu=?,category=?,station=?,address=?,description=?,price=?,minutes=?,image=?,open=?,menus=? WHERE member_id=?',
          )
          .bind(
            name,
            menu,
            category,
            station,
            clean(b.address, 150),
            clean(b.description, 200),
            Number.isFinite(minPrice) ? minPrice : first.price,
            b.minutes,
            photoByCategory[category],
            b.open === true ? 1 : 0,
            JSON.stringify(menus),
            m.id,
          )
          .run();
        result = { ok: true };
      }
    } else if (path === 'orders' && req.method === 'GET') {
      const m = await user(req);
      const rows = await db()
        .prepare(
          orderSelect +
            ` WHERE ${m.role === 'seller' ? 'seller_id' : 'buyer_id'}=? ORDER BY created DESC `,
        )
        .bind(m.id)
        .all<Record<string, unknown>>();
      result = rows.results.map((r) => ({
        ...r,
        code: m.role === 'buyer' && r.status === 3 ? r.code : '',
        buyerId: undefined,
        sellerId: undefined,
      }));
    } else if (path === 'orders' && req.method === 'POST') {
      const m = await user(req);
      await rate('order:' + m.id, 80, 60000);
      if (b.action === 'create') {
        if (m.role !== 'buyer') fail(403, '구매자 계정으로 주문해 주세요.');
        if (
          !Number.isInteger(b.qty) ||
          Number(b.qty) < 1 ||
          Number(b.qty) > 10 ||
          typeof b.note !== 'string' ||
          b.note.length > 200 ||
          typeof b.requestId !== 'string' ||
          !/^[a-f0-9-]{36}$/.test(b.requestId)
        )
          fail(400, '주문 내용을 확인해 주세요.');
        const existing = await db()
          .prepare(
            'SELECT id FROM pickup_orders WHERE buyer_id=? AND request_id=?',
          )
          .bind(m.id, b.requestId)
          .first();
        if (existing) {
          result = { ok: true };
        } else {
          const shop = await db()
            .prepare(
              'SELECT * FROM merchants WHERE id=? AND open=1 AND price>0',
            )
            .bind(String(b.shopId))
            .first<Record<string, unknown>>();
          if (!shop || shop.station !== b.station)
            fail(409, '현재 주문할 수 없는 매장입니다.');
          const menus = readMenus(shop);
          const chosen =
            b.menuId === undefined
              ? menus.find((x) => x.available)
              : menus.find((x) => x.id === b.menuId && x.available);
          if (!chosen)
            fail(
              409,
              '판매 중인 메뉴가 아니에요. 메뉴 목록을 다시 확인해 주세요.',
            );
          if (b.unitPrice !== chosen.price)
            fail(
              409,
              '메뉴 가격이 변경됐어요. 가게 목록을 새로 확인해 주세요.',
            );
          let done = false;
          for (let n = 1; n <= 12; n++) {
            try {
              const created = Date.now();
              const r = await db()
                .prepare(
                  'INSERT INTO pickup_orders (id,buyer_id,seller_id,shop_id,shop_name,menu_name,image,station,qty,total,status,locker,created,eta,note,code,request_id) SELECT ?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM members WHERE id=?) AND EXISTS(SELECT 1 FROM merchants WHERE id=? AND open=1 AND price=? AND menus=? AND minutes=? AND station=? AND member_id IN (SELECT id FROM members))',
                )
                .bind(
                  crypto.randomUUID(),
                  m.id,
                  shop.member_id,
                  shop.id,
                  shop.name,
                  chosen.name,
                  shop.image,
                  shop.station,
                  b.qty,
                  chosen.price * Number(b.qty),
                  n,
                  created,
                  created + Number(shop.minutes) * 60000,
                  b.note,
                  String(
                    100000 +
                      (crypto.getRandomValues(new Uint32Array(1))[0] % 900000),
                  ),
                  b.requestId,
                  m.id,
                  shop.id,
                  shop.price,
                  shop.menus,
                  shop.minutes,
                  shop.station,
                )
                .run();
              if (!r.meta.changes)
                fail(409, '매장 정보가 바뀌었어요. 다시 확인해 주세요.');
              done = true;
              break;
            } catch (e) {
              if (!String(e).includes('UNIQUE')) throw e;
              const same = await db()
                .prepare(
                  'SELECT id FROM pickup_orders WHERE buyer_id=? AND request_id=?',
                )
                .bind(m.id, b.requestId)
                .first();
              if (same) {
                done = true;
                break;
              }
            }
          }
          if (!done)
            fail(
              409,
              '이 역의 보관함이 모두 사용 중입니다. 잠시 후 다시 주문해 주세요.',
            );
          result = { ok: true };
        }
      } else {
        const order = await db()
          .prepare('SELECT * FROM pickup_orders WHERE id=?')
          .bind(String(b.id))
          .first<Record<string, unknown>>();
        if (
          !order ||
          order[m.role === 'seller' ? 'seller_id' : 'buyer_id'] !== m.id
        )
          fail(404, '주문을 찾을 수 없습니다.');
        const status = Number(order.status);
        let next = -1;
        if (b.action === 'delay') {
          if (m.role !== 'seller' || status >= 3)
            fail(403, '준비 중인 매장 주문만 시간을 변경할 수 있어요.');
          await db()
            .prepare(
              'UPDATE pickup_orders SET eta=MAX(eta,?)+300000 WHERE id=? AND status<3',
            )
            .bind(Date.now(), order.id)
            .run();
          result = { ok: true };
        } else {
          if (
            b.action === 'cancel' &&
            (status === 0 || (m.role === 'seller' && status < 3))
          )
            next = 5;
          else if (b.action === 'next' && m.role === 'seller' && status < 3)
            next = status + 1;
          else if (
            b.action === 'collect' &&
            m.role === 'buyer' &&
            status === 3
          ) {
            await rate('code:' + String(order.id), 8, 900000);
            if (b.code !== order.code)
              fail(400, '수령 코드가 일치하지 않습니다.');
            next = 4;
          }
          if (next < 0) fail(409, '현재 상태에서는 처리할 수 없어요.');
          const updated = await db()
            .prepare(
              'UPDATE pickup_orders SET status=?,canceled_by=CASE WHEN ?=5 THEN ? ELSE canceled_by END,ready=CASE WHEN ?=3 THEN ? ELSE ready END WHERE id=? AND status=?',
            )
            .bind(next, next, m.role, next, Date.now(), order.id, status)
            .run();
          if (!updated.meta.changes)
            fail(409, '주문 상태가 바뀌었어요. 새로고침해 주세요.');
          result = { ok: true };
        }
      }
    } else fail(404, '요청을 찾을 수 없습니다.');
    if (result && typeof result === 'object' && 'sessionToken' in result) {
      const token = String(result.sessionToken);
      headers.set(
        'Set-Cookie',
        `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${local ? '' : '; Secure'}`,
      );
      delete result.sessionToken;
    }
    return new Response(JSON.stringify(result), { headers });
  } catch (e) {
    if (e instanceof ApiError)
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status,
        headers,
      });
    console.error('API failure', e instanceof Error ? e.message : 'unknown');
    return new Response(
      JSON.stringify({
        error: '처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
      }),
      { status: 500, headers },
    );
  }
}
