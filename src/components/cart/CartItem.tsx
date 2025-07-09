
'use client';

import Image from 'next/image';
import type { CartItem as CartItemType } from '@/lib/types';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageProvider';

export default function CartItem({ item }: { item: CartItemType }) {
  const { updateQuantity, removeFromCart } = useCart();
  const { getTranslated } = useLanguage();

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value, 10);
    // Let useCart handle the logic, including validation
    if (!isNaN(newQuantity)) {
        updateQuantity(item.id, newQuantity);
    } else if (e.target.value === '') {
        // Allow clearing the input, treat as 1 to avoid NaN issues.
        updateQuantity(item.id, 1);
    }
  }

  return (
    <div className="flex items-center gap-4 p-4">
      <div className="relative h-20 w-20 rounded-md overflow-hidden">
        <Image src={item.imageUrl} alt={getTranslated(item, 'name')} fill className="object-cover" data-ai-hint={item['data-ai-hint']} />
      </div>
      <div className="flex-grow">
        <p className="font-semibold">{getTranslated(item, 'name')}</p>
        <p className="text-sm text-muted-foreground">RM {item.price.toFixed(2)} / {item.unit}</p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="1"
          max={item.stock}
          value={item.quantity}
          onChange={handleQuantityChange}
          className="w-16 h-9 text-center"
        />
      </div>
      <div className="font-semibold w-20 text-right">
        RM {(item.price * item.quantity).toFixed(2)}
      </div>
      <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
