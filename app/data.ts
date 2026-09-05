export const shops = [
  {
    id: 'green',
    name: '그린테이블',
    category: '샐러드',
    desc: '가볍지만 든든하게, 오늘의 신선함',
    minutes: 15,
    price: 10900,
    menu: '그릴드 치킨 샐러드',
    image: 'photo-1512621776951-a57141f2eefd',
    tag: '가볍게 한 끼',
    stations: ['신도림', '영등포'],
  },
  {
    id: 'bowl',
    name: '온기 덮밥',
    category: '한식',
    desc: '따뜻한 밥 한 그릇에 담은 정성',
    minutes: 20,
    price: 9900,
    menu: '직화 불고기 덮밥',
    image: 'photo-1547592180-85f173990554',
    tag: '든든한 인기 메뉴',
    stations: ['신도림', '영등포'],
  },
  {
    id: 'bread',
    name: '브레드 스테이션',
    category: '샌드위치',
    desc: '바쁜 하루에도 맛있는 작은 여유',
    minutes: 12,
    price: 7800,
    menu: '치킨 아보카도 샌드위치',
    image: 'photo-1528735602780-2552fd46c7af',
    tag: '빠른 픽업',
    stations: ['신도림'],
  },
  {
    id: 'coffee',
    name: '데일리 브루',
    category: '커피·음료',
    desc: '향긋한 커피와 함께 다음 정거장으로',
    minutes: 8,
    price: 4500,
    menu: '아이스 카페라테',
    image: 'photo-1461023058943-07fcbe16d735',
    tag: '잠깐의 충전',
    stations: ['신도림', '영등포'],
  },
];
export const statuses = [
  '주문 접수',
  '준비 중',
  '픽업존 이동',
  '입고 완료',
  '수령 완료',
  '취소',
];
export type Order = {
  canceledBy?: string;
  id: string;
  shopId: string;
  shopName?: string;
  menuName?: string;
  image?: string;
  station: string;
  qty: number;
  total: number;
  status: number;
  locker: number;
  created: number;
  eta: number;
  note: string;
  code: string;
  ready: number | null;
};
export const won = (n: number) => n.toLocaleString('ko-KR') + '원';
