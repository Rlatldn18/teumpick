import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    owner: text('owner').notNull(),
    shopId: text('shop_id').notNull(),
    station: text('station').notNull(),
    qty: integer('qty').notNull(),
    total: integer('total').notNull(),
    status: integer('status').notNull(),
    locker: integer('locker').notNull(),
    created: integer('created').notNull(),
    eta: integer('eta').notNull(),
    note: text('note').notNull(),
    code: text('code').notNull(),
    ready: integer('ready'),
  },
  (t) => [
    index('orders_owner').on(t.owner),
    uniqueIndex('active_locker')
      .on(t.owner, t.station, t.locker)
      .where(sql`${t.status} < 4`),
  ],
);

// Version 2 uses independent app accounts. Legacy pilot tables stay intact.
export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  password: text('password').notNull(),
  recovery: text('recovery').notNull(),
  created: integer('created').notNull(),
  termsVersion: text('terms_version').notNull(),
});
export const sessions = sqliteTable(
  'sessions',
  {
    hash: text('hash').primaryKey(),
    memberId: text('member_id').notNull(),
    expires: integer('expires').notNull(),
  },
  (t) => [index('sessions_member').on(t.memberId)],
);
export const merchants = sqliteTable('merchants', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().unique(),
  name: text('name').notNull(),
  station: text('station').notNull(),
  address: text('address').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  menu: text('menu').notNull(),
  price: integer('price').notNull(),
  minutes: integer('minutes').notNull(),
  image: text('image').notNull(),
  open: integer('open').notNull(),
  created: integer('created').notNull(),
});
export const pickupOrders = sqliteTable(
  'pickup_orders',
  {
    id: text('id').primaryKey(),
    buyerId: text('buyer_id').notNull(),
    sellerId: text('seller_id').notNull(),
    shopId: text('shop_id').notNull(),
    shopName: text('shop_name').notNull(),
    menuName: text('menu_name').notNull(),
    image: text('image').notNull(),
    station: text('station').notNull(),
    qty: integer('qty').notNull(),
    total: integer('total').notNull(),
    status: integer('status').notNull(),
    locker: integer('locker').notNull(),
    created: integer('created').notNull(),
    eta: integer('eta').notNull(),
    note: text('note').notNull(),
    code: text('code').notNull(),
    ready: integer('ready'),
    requestId: text('request_id').notNull(),
  },
  (t) => [
    index('pickup_buyer').on(t.buyerId),
    index('pickup_seller').on(t.sellerId),
    uniqueIndex('pickup_request').on(t.buyerId, t.requestId),
    uniqueIndex('pickup_global_locker')
      .on(t.station, t.locker)
      .where(sql`${t.status}<4`),
  ],
);
export const attempts = sqliteTable('auth_attempts', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  reset: integer('reset').notNull(),
});
