
'use client';

import Image from 'next/image';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart } from '@/hooks/use-cart';
import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/LanguageProvider';

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart, cartItems } = useCart();
  const { getTranslated, t } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();

  const itemInCart = cartItems.find(item => item.id === product.id);
  const stockInCart = itemInCart ? itemInCart.quantity : 0;
  const availableStock = product.stock - stockInCart;

  const handleAddToCart = () => {
    if (quantity <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Quantity',
        description: 'Please enter a quantity greater than 0.',
      });
      return;
    }
     if (quantity > availableStock) {
      toast({
        variant: 'destructive',
        title: 'Not enough stock!',
        description: `You can only add ${availableStock} more of ${getTranslated(product, 'name')}.`,
      });
      return;
    }
    addToCart(product, quantity);
  };
  
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <CardHeader className="p-0">
        <div className="aspect-video relative">
          <Image
            src={product.imageUrl}
            alt={getTranslated(product, 'name')}
            fill
            className="object-cover"
            data-ai-hint={product['data-ai-hint']}
          />
        </div>
        <div className="p-4">
          <CardTitle className="text-lg font-headline">{getTranslated(product, 'name')}</CardTitle>
          <CardDescription className="mt-1 text-sm h-10">{getTranslated(product, 'description')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0">
        <p className="text-xl font-semibold text-primary">RM {product.price.toFixed(2)} / {product.unit}</p>
        <p className="text-xs text-muted-foreground">{product.category}</p>
        <p className={`text-sm mt-2 font-medium ${product.stock > 5 ? 'text-green-600' : 'text-amber-600'} ${product.stock === 0 ? 'text-destructive' : ''}`}>
          {product.stock > 0 ? t('product.in_stock', { count: product.stock }) : t('product.out_of_stock')}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="flex w-full items-center gap-2">
            <Input
                type="number"
                min="1"
                max={availableStock}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 h-9 text-center"
                aria-label="Quantity"
                disabled={availableStock <= 0}
            />
            <Button className="w-full" onClick={handleAddToCart} disabled={availableStock <= 0}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {availableStock > 0 ? t('product.add_to_cart') : t('product.out_of_stock')}
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
