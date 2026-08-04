export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  image_key: string | null;
  image_url: string | null;
  category: string;
  stock_quantity: number;
  is_active: boolean;
  featured: boolean;
  display_order: number;
};

export const productImage = (p: { image_url?: string | null }) => p.image_url || "";
