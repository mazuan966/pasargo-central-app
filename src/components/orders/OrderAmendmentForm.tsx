
'use client';

import { useState, useEffect } from 'react';
import type { Order, Product, CartItem, ProductVariant } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Loader2, XCircle, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useOrders } from '@/hooks/use-orders';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { amendOrderAction } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/context/LanguageProvider';

export function OrderAmendmentForm({ order }: { order: Order }) {
  const [amendedItems, setAmendedItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  
  const { updateOrder } = useOrders();
  const { userData } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const itemsJson = JSON.stringify(order.items);

  useEffect(() => {
    const initialCartItems: CartItem[] = order.items.map(item => ({
        id: `${item.productId}_${item.variantId}`,
        productId: item.productId,
        productName: item.name,
        productName_ms: item.name_ms,
        productName_th: item.name_th,
        variantId: item.variantId,
        variantName: item.variantName,
        quantity: item.quantity,
        price: item.price,
        unit: item.unit,
        stock: 0, // Placeholder, will be updated from product fetch
        imageUrl: '', // Placeholder
    }));
    setAmendedItems(initialCartItems);

    const fetchProducts = async () => {
      if (!db) return;
      setIsLoadingProducts(true);
      const productsCollection = collection(db, 'products');
      const productSnapshot = await getDocs(productsCollection);
      const fetchedProducts = productSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Product[];
      setProducts(fetchedProducts);
      
      // Update stock and image url in amendedItems from fetched products
      setAmendedItems(currentItems => currentItems.map(cartItem => {
          const product = fetchedProducts.find(p => p.id === cartItem.productId);
          if (product) {
              const variant = product.variants.find(v => v.id === cartItem.variantId);
              return {
                  ...cartItem,
                  stock: variant?.stock ?? 0,
                  imageUrl: product.imageUrl,
              };
          }
          return cartItem;
      }));
      setIsLoadingProducts(false);
    };
    fetchProducts();
  }, [order.id, itemsJson]);

  const handleQuantityChange = (cartItemId: string, newQuantityStr: string) => {
    let newQuantity = parseInt(newQuantityStr, 10);
    if (isNaN(newQuantity) || newQuantity < 0) newQuantity = 0;
    
    setAmendedItems(items => items.map(item => 
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
    ).filter(item => item.quantity > 0)); // Remove if quantity is 0
  };
  
  const handleAddProduct = (product: Product, variant: ProductVariant) => {
    setAmendedItems(currentItems => {
        const cartItemId = `${product.id}_${variant.id}`;
        const existingItem = currentItems.find(item => item.id === cartItemId);
        if (existingItem) {
            return currentItems.map(item => item.id === cartItemId ? {...item, quantity: item.quantity + 1} : item);
        }
        const newCartItem: CartItem = {
            id: cartItemId,
            productId: product.id,
            productName: product.name,
            productName_ms: product.name_ms,
            productName_th: product.name_th,
            description: product.description,
            description_ms: product.description_ms,
            description_th: product.description_th,
            variantId: variant.id,
            variantName: variant.name,
            quantity: 1,
            price: variant.price,
            unit: variant.unit,
            stock: variant.stock,
            imageUrl: product.imageUrl,
            hasSst: product.hasSst
        };
        return [...currentItems, newCartItem];
    });
    setPopoverOpen(false);
  };

  const handleCancelAmendment = async () => {
    await updateOrder({ ...order, isEditable: false });
    toast({ title: t('order_amendment.toast.cancelled_title'), description: t('order_amendment.toast.cancelled_description') });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) {
      toast({ variant: 'destructive', title: t('order_amendment.toast.error_title'), description: t('order_amendment.toast.error_description') });
      return;
    }
    
    setIsPending(true);

    const result = await amendOrderAction({
      originalOrder: order,
      amendedItems,
      userData,
    });
    
    if (result.success) {
      toast({ title: t('order_amendment.toast.updated_title'), description: result.message });
    } else {
      toast({ variant: 'destructive', title: t('order_amendment.toast.failed_title'), description: result.message });
    }
    
    setIsPending(false);
  };

  const subtotal = amendedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const sst = amendedItems.reduce((sum, item) => item.hasSst ? sum + (item.price * item.quantity * 0.06) : sum, 0);
  const total = subtotal + sst;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow><TableHead>Product</TableHead><TableHead className="w-[120px]">Quantity</TableHead><TableHead className="text-right">Total</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                    {amendedItems.map(item => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">
                                {item.productName}
                                <span className="text-muted-foreground text-sm block">{item.variantName}</span>
                            </TableCell>
                            <TableCell>
                                <Input type="number" value={item.quantity} min={0} onChange={(e) => handleQuantityChange(item.id, e.target.value)} className="h-8 w-20 text-center" />
                            </TableCell>
                            <TableCell className="text-right">RM {(item.price * item.quantity).toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                     {amendedItems.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground h-24">This order is empty. Add items to continue.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" disabled={isLoadingProducts}>
                    {isLoadingProducts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} {t('order_amendment.add_item_button')}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                 <Command>
                    <CommandInput placeholder={t('order_amendment.search_placeholder')} />
                    <CommandList>
                        <CommandEmpty>{t('order_amendment.no_products_found')}</CommandEmpty>
                        {products.map((product) => (
                          <CommandGroup key={product.id} heading={product.name}>
                            {product.variants.map((variant) => (
                                <CommandItem key={variant.id} value={`${product.name} ${variant.name}`} onSelect={() => handleAddProduct(product, variant)}>{variant.name}</CommandItem>
                            ))}
                          </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
        
        <Separator />
        
        <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between"><span>Subtotal:</span> <span>RM {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>SST (6%):</span> <span>RM {sst.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                  <span>New Order Total:</span>
                  <span>RM {total.toFixed(2)}</span>
                </div>
            </div>
        </div>
        
        <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleCancelAmendment} disabled={isPending}>{t('order_amendment.cancel_button')}</Button>
            <Button type="submit" disabled={isPending || amendedItems.length === 0}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('profile.save_button')}
            </Button>
        </div>
    </form>
  );
}
