import { useRecommendations } from "@/lib/recommendations";
import { ProductCard } from "./product-card";

export function Recommendations() {
  const { products } = useRecommendations(4);
  if (products.length < 2) return null;

  return (
    <section className="pt-6">
      <div className="flex items-center justify-between px-5">
        <h2 className="text-lg font-bold">Picked for you</h2>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 px-5">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </section>
  );
}
