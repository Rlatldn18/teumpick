// Shared by the bundled Android app and the existing preview.
export type Member = {
  id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller';
  created: number;
};
export type Shop = {
  menus?: MenuItem[];
  menuId?: string;
  id: string;
  name: string;
  category: string;
  desc: string;
  minutes: number;
  price: number;
  menu: string;
  image: string;
  tag: string;
  stations: string[];
  open?: boolean;
};
export type MenuItem = {
  id: string;
  name: string;
  group: string;
  description: string;
  price: number;
  available: boolean;
};
