import { ProductForm } from "@/components/ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground ">Add New Product</h1>
        <p className="mt-1 text-sm text-muted-foreground ">
          Fill in the details below to add a new product to your inventory.
        </p>
      </div>

      <ProductForm />
    </div>
  );
}
