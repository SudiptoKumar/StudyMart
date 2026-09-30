import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/product-form";

export const Route = createFileRoute("/admin/products/new")({
  component: NewProduct,
});

function NewProduct() {
  return <ProductForm />;
}
