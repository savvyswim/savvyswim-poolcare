import shopRobot from "@/assets/shop-robot-cleaner.jpg";
import shopChemicals from "@/assets/shop-chemicals.jpg";
import shopPump from "@/assets/shop-pump.jpg";
import shopTools from "@/assets/shop-tools.jpg";

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

export const PRODUCT_IMAGES: Record<string, string> = {
  robot: shopRobot,
  chemicals: shopChemicals,
  pump: shopPump,
  tools: shopTools,
};

export const productImage = (p: { image_key?: string | null; image_url?: string | null }) =>
  (p.image_key && PRODUCT_IMAGES[p.image_key]) || p.image_url || shopTools;
