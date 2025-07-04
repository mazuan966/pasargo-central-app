
'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, Edit, Loader2 } from 'lucide-react';

interface StockManagerProps {
  product: Product;
  onStockUpdate: (productId: string, quantityToAdd: number) => Promise<void>;
}

export function StockManager({ product, onStockUpdate }: StockManagerProps) {
  const [quantityToAdd, setQuantityToAdd] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = async () => {
    if (quantityToAdd <= 0) return;
    setIsLoading(true);
    await onStockUpdate(product.id, quantityToAdd);
    setIsLoading(false);
    setQuantityToAdd(0);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 justify-start w-full px-1">
          <span>{product.stock}</span>
          <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Add Stock</h4>
            <p className="text-sm text-muted-foreground">
              Add more units to '{product.name}'.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quantity-to-add">Quantity to Add</Label>
            <Input
              id="quantity-to-add"
              type="number"
              min="1"
              value={quantityToAdd || ''}
              onChange={(e) => setQuantityToAdd(parseInt(e.target.value, 10) || 0)}
              className="col-span-2 h-8"
              placeholder="0"
            />
            <Button onClick={handleSave} disabled={isLoading || quantityToAdd <= 0} size="sm">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
