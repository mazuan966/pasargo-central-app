
'use client';

import Image from 'next/image';
import type { Product, ProductVariant } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart } from '@/hooks/use-cart';
import { ShoppingCart } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/LanguageProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart, cartItems } = useCart();
  const { getTranslated, t } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();
  
  const hasVariants = (product.variants?.length || 0) > 1;
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(product.variants?.[0]?.id);

  const selectedVariant = useMemo(() => {
    return product.variants?.find(v => v.id === selectedVariantId);
  }, [selectedVariantId, product.variants]);

  const itemInCart = useMemo(() => {
      if (!selectedVariant) return null;
      const cartItemId = `${product.id}_${selectedVariant.id}`;
      return cartItems.find(item => item.id === cartItemId);
  }, [cartItems, product.id, selectedVariant]);
  
  const stockInCart = itemInCart ? itemInCart.quantity : 0;
  const availableStock = selectedVariant ? selectedVariant.stock - stockInCart : 0;

  useEffect(() => {
    // Reset quantity to 1 when variant changes
    setQuantity(1);
  }, [selectedVariantId]);
  
  const handleAddToCart = () => {
    if (!selectedVariant) {
        toast({ variant: 'destructive', title: 'Please select a variant' });
        return;
    }
    if (quantity <= 0) {
      toast({ variant: 'destructive', title: t('toast.invalid_quantity_title'), description: t('toast.invalid_quantity_description') });
      return;
    }
    if (quantity > availableStock) {
      toast({ variant: 'destructive', title: t('toast.not_enough_stock_title'), description: t('toast.not_enough_stock_description', { stock: availableStock, name: `${getTranslated(product, 'name')} (${selectedVariant.name})` }) });
      return;
    }
    addToCart(product, selectedVariant, quantity);
    setQuantity(1);
  };

  const getPriceDisplay = () => {
      if (!product.variants || product.variants.length === 0) {
          return 'Not available';
      }
      if (hasVariants && !selectedVariant) {
          const prices = product.variants.map(v => v.price);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          if (minPrice === maxPrice) return `RM ${minPrice.toFixed(2)}`;
          return `RM ${minPrice.toFixed(2)} - RM ${maxPrice.toFixed(2)}`;
      }
      if (selectedVariant) {
          return `RM ${selectedVariant.price.toFixed(2)}`;
      }
      // Single variant case
      return `RM ${product.variants[0].price.toFixed(2)}`;
  };
  
  const getTotalStock = () => product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <CardHeader className="p-0">
        <div className="aspect-video relative">
          <Image src={product.imageUrl} alt={getTranslated(product, 'name')} fill className="object-cover" data-ai-hint={product['data-ai-hint']} />
        </div>
        <div className="p-4">
          <CardTitle className="text-lg font-headline">{getTranslated(product, 'name')}</CardTitle>
          <CardDescription className="mt-1 text-sm h-10">{getTranslated(product, 'description')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0 space-y-2">
        <div>
          <p className="text-xl font-semibold text-primary">{getPriceDisplay()}</p>
          <p className="text-xs text-muted-foreground">{product.category}</p>
        </div>
        {hasVariants && (
            <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
                <SelectContent>
                    {product.variants?.map(variant => (
                        <SelectItem key={variant.id} value={variant.id}>
                            {variant.name} - RM {variant.price.toFixed(2)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        )}
        <p className={`text-sm font-medium ${availableStock > 5 ? 'text-green-600' : 'text-amber-600'} ${availableStock <= 0 ? 'text-destructive' : ''}`}>
          {selectedVariant ? 
            (availableStock > 0 ? t('product.in_stock', { count: availableStock }) : t('product.out_of_stock'))
            : (getTotalStock() > 0 ? `${getTotalStock()} total in stock` : t('product.out_of_stock'))
          }
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
                disabled={availableStock <= 0 || !selectedVariant}
            />
            <Button className="w-full" onClick={handleAddToCart} disabled={availableStock <= 0 || !selectedVariant}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {availableStock > 0 ? t('product.add_to_cart') : t('product.out_of_stock')}
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
