import ProductList from '@/components/shop/ProductList';
import { mockProducts } from '@/lib/mock-data';

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center mb-6">
        <h1 className="text-3xl font-headline font-bold">Products</h1>
      </div>
      <ProductList products={mockProducts} />
    </div>
  );
}
