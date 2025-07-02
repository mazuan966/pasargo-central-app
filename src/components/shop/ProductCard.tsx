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

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();

  const handleAddToCart = () => {
    if (quantity > 0) {
      addToCart(product, quantity);
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid Quantity',
        description: 'Please enter a quantity greater than 0.',
      });
    }
  };
  
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <CardHeader className="p-0">
        <div className="aspect-video relative">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            data-ai-hint={product['data-ai-hint']}
          />
        </div>
        <div className="p-4">
          <CardTitle className="text-lg font-headline">{product.name}</CardTitle>
          <CardDescription className="mt-1 text-sm h-10">{product.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0">
        <p className="text-xl font-semibold text-primary">RM {product.price.toFixed(2)} / {product.unit}</p>
        <p className="text-xs text-muted-foreground">{product.category}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="flex w-full items-center gap-2">
            <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 h-9 text-center"
                aria-label="Quantity"
            />
            <Button className="w-full" onClick={handleAddToCart}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}