import CartView from '@/components/cart/CartView';

export default function CartPage() {
  return (
    <div>
      <div className="flex items-center mb-6">
        <h1 className="text-3xl font-headline font-bold">Shopping Cart</h1>
      </div>
      <CartView />
    </div>
  );
}
