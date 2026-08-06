import { useEffect, useState } from "react";
import { Link, useParams } from "@/lib/router-compat";
import { ArrowLeft, Loader2 } from "lucide-react";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { ShopifyCartDrawer } from "@/components/ShopifyCartDrawer";
import { useCartSync } from "@/hooks/useCartSync";
import { useShopifyCart } from "@/stores/shopifyCart";
import {
  PRODUCT_BY_HANDLE_QUERY,
  money,
  storefrontApiRequest,
  type ShopifyProduct,
} from "@/lib/shopify";

const ProductDetail = () => {
  useCartSync();
  const { handle } = useParams();
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [variantId, setVariantId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const addItem = useShopifyCart((s) => s.addItem);
  const isLoading = useShopifyCart((s) => s.isLoading);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
        const node = data?.data?.product;
        if (node) {
          setProduct({ node });
          setVariantId(node.variants.edges[0]?.node?.id ?? "");
        }
      } catch (e) {
        console.error("Failed to load product", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [handle]);

  const variant = product?.node.variants.edges.find((v) => v.node.id === variantId)?.node;

  return (
    <main className="min-h-screen bg-background">
      {product && (
        <Seo
          title={`${product.node.title} | Savvy Swim Shop`}
          description={(product.node.description || `Buy ${product.node.title} from the Savvy Swim pool supply shop.`).slice(0, 155)}
          path={`/product/${handle}`}
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.node.title,
            description: product.node.description,
            image: product.node.images.edges[0]?.node?.url,
            offers: {
              "@type": "Offer",
              price: (variant ?? product.node.variants.edges[0]?.node)?.price?.amount,
              priceCurrency: (variant ?? product.node.variants.edges[0]?.node)?.price?.currencyCode,
              url: `https://savvyswim.com/product/${handle}`,
              availability: "https://schema.org/InStock",
            },
          }}
        />
      )}
      <header className="border-b">
        <div className="mx-auto max-w-5xl px-5 h-16 flex items-center justify-between">
          <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-medium">
            <ArrowLeft className="h-4 w-4" /> Back to shop
          </Link>
          <ShopifyCartDrawer />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-12">
        {loading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !product ? (
          <p className="py-24 text-center text-muted-foreground">Product not found</p>
        ) : (
          <div className="grid gap-10 md:grid-cols-2">
            <div className="aspect-square rounded-xl bg-muted overflow-hidden">
              {product.node.images.edges[0]?.node && (
                <img
                  src={product.node.images.edges[0].node.url}
                  alt={product.node.images.edges[0].node.altText ?? product.node.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{product.node.title}</h1>
              <p className="mt-3 text-2xl font-semibold">
                {variant
                  ? money(variant.price.amount, variant.price.currencyCode)
                  : money(
                      product.node.priceRange.minVariantPrice.amount,
                      product.node.priceRange.minVariantPrice.currencyCode,
                    )}
              </p>
              <p className="mt-4 text-muted-foreground whitespace-pre-line">{product.node.description}</p>

              {product.node.variants.edges.length > 1 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {product.node.variants.edges.map(({ node: v }) => (
                    <Button
                      key={v.id}
                      variant={v.id === variantId ? "default" : "outline"}
                      size="sm"
                      disabled={!v.availableForSale}
                      onClick={() => setVariantId(v.id)}
                    >
                      {v.title}
                    </Button>
                  ))}
                </div>
              )}

              <Button
                className="mt-8 w-full"
                size="lg"
                disabled={isLoading || !variant || !variant.availableForSale}
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
        )}
      </section>
    </main>
  );
};

export default ProductDetail;
