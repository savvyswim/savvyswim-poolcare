import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { ShopifyCartDrawer } from "@/components/ShopifyCartDrawer";
import { useCartSync } from "@/hooks/useCartSync";
import { useShopifyCart } from "@/stores/shopifyCart";
import { STOREFRONT_QUERY, money, storefrontApiRequest, type ShopifyProduct } from "@/lib/shopify";

const Store = () => {
  useCartSync();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useShopifyCart((s) => s.addItem);
  const isLoading = useShopifyCart((s) => s.isLoading);

  useEffect(() => {
    (async () => {
      try {
        const data = await storefrontApiRequest(STOREFRONT_QUERY, { first: 50 });
        setProducts(data?.data?.products?.edges ?? []);
      } catch (e) {
        console.error("Failed to load products", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <Seo
        title="Pool Supply Shop | Savvy Swim"
        description="Shop pro-grade pool chemicals, equipment and tools with contractor pricing. Secure checkout from Savvy Swim in Texas."
        path="/shop"
      />
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="font-bold tracking-tight text-lg">
            Savvy Swim
          </Link>
          <ShopifyCartDrawer />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Pool supply shop</h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          Pro-grade chemicals, equipment and tools. Secure checkout powered by Shopify.
        </p>

        {loading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">No products found</div>
        ) : (
          <div className="mt-10 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const p = product.node;
              const variant = p.variants.edges[0]?.node;
              const image = p.images.edges[0]?.node;
              return (
                <div key={p.id} className="rounded-xl border overflow-hidden flex flex-col">
                  <Link to={`/product/${p.handle}`} className="block aspect-square bg-muted">
                    {image && (
                      <img
                        src={image.url}
                        alt={image.altText ?? p.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </Link>
                  <div className="p-4 flex flex-col flex-1">
                    <Link to={`/product/${p.handle}`} className="font-semibold hover:underline">
                      {p.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="font-bold">
                        {money(p.priceRange.minVariantPrice.amount, p.priceRange.minVariantPrice.currencyCode)}
                      </span>
                      <Button
                        size="sm"
                        disabled={isLoading || !variant}
                        onClick={() =>
                          variant &&
                          addItem({
                            product,
                            variantId: variant.id,
                            variantTitle: variant.title,
                            price: variant.price,
                            quantity: 1,
                            selectedOptions: variant.selectedOptions ?? [],
                          })
                        }
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to cart"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default Store;
