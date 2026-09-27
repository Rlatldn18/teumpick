export type SalesPeriod = 'day' | 'week' | 'month' | 'year';
export function koreaDate(timestamp: number) {
  return new Date(timestamp + 9 * 3600000).toISOString().slice(0, 10);
}
export function salesRange(date: string, period: SalesPeriod) {
  const start = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(start.getTime())) throw new Error('Invalid date');
  if (period === 'week')
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  if (period === 'month' || period === 'year') start.setUTCDate(1);
  if (period === 'year') start.setUTCMonth(0);
  const end = new Date(start);
  if (period === 'day') end.setUTCDate(end.getUTCDate() + 1);
  if (period === 'week') end.setUTCDate(end.getUTCDate() + 7);
  if (period === 'month') end.setUTCMonth(end.getUTCMonth() + 1);
  if (period === 'year') end.setUTCFullYear(end.getUTCFullYear() + 1);
  return {
    start: start.getTime() - 9 * 3600000,
    end: end.getTime() - 9 * 3600000,
    label: `${start.toISOString().slice(0, 10)} ~ ${new Date(end.getTime() - 1).toISOString().slice(0, 10)}`,
  };
}
