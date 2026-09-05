// Shared by the bundled Android app and the existing preview.
export type Member = {
  id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller';
  created: number;
};
export type Shop = {
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
