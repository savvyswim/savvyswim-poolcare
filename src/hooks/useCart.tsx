import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartLine = {
  product_id: string | null;
  name: string;
  sku: string | null;
  price: number;
  image: string;
  quantity: number;
};

type CartContext = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
};

const TAX_RATE = 0.0825; // Texas state sales tax
const FREE_SHIPPING_OVER = 500;
const FLAT_SHIPPING = 39;

const Ctx = createContext<CartContext | null>(null);
const STORAGE_KEY = "savvyswim_cart_v1";

const keyOf = (l: { sku: string | null; name: string }) => l.sku ?? l.name;

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartLine[]) : [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore quota errors */
    }
  }, [lines]);

  const add = useCallback((line: Omit<CartLine, "quantity">, qty = 1) => {
    setLines((prev) => {
      const k = keyOf(line);
      const found = prev.find((l) => keyOf(l) === k);
      if (found) {
        return prev.map((l) =>
          keyOf(l) === k ? { ...l, quantity: Math.min(999, l.quantity + qty) } : l,
        );
      }
      return [...prev, { ...line, quantity: qty }];
    });
    setOpen(true);
  }, []);

  const setQty = useCallback((sku: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => keyOf(l) !== sku)
        : prev.map((l) => (keyOf(l) === sku ? { ...l, quantity: Math.min(999, qty) } : l)),
    );
  }, []);

  const remove = useCallback((sku: string) => {
    setLines((prev) => prev.filter((l) => keyOf(l) !== sku));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContext>(() => {
    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_OVER ? 0 : FLAT_SHIPPING;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    return {
      lines,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      subtotal: Math.round(subtotal * 100) / 100,
      tax,
      shipping,
      total: Math.round((subtotal + tax + shipping) * 100) / 100,
      open,
      setOpen,
      add,
      setQty,
      remove,
      clear,
    };
  }, [lines, open, add, setQty, remove, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useCart = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
