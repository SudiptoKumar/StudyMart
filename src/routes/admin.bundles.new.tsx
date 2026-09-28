import { createFileRoute } from "@tanstack/react-router";
import { BundleForm } from "@/components/admin/bundle-form";

export const Route = createFileRoute("/admin/bundles/new")({
  component: () => <BundleForm />,
});
