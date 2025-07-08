
'use client';

import { useState, useEffect, useActionState } from 'react';
import type { Order, Product, CartItem } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Loader2, XCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useOrders } from '@/hooks/use-orders';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { amendOrderAction } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';

export function OrderAmendmentForm({ order }: { order: Order }) {
  const [amendedItems, setAmendedItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  
  const { updateOrder } = useOrders();
  const { userData } = useAuth();
  const { toast } = useToast();

  const itemsJson = JSON.stringify(order.items);

  useEffect(() => {
    setAmendedItems(order.items.map(item => ({ ...item, id: item.productId })));
    const fetchProducts = async () => {
      if (!db) return;
      setIsLoadingProducts(true);
      const productsCollection = collection(db, 'products');
      const productSnapshot = await getDocs(productsCollection);
      setProducts(productSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Product[]);
      setIsLoadingProducts(false);
    };
    fetchProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, itemsJson]);

  const handleQuantityChange = (productId: string, newQuantityStr: string) => {
    const originalItem = order.items.find(i => i.productId === productId);
    const originalQuantity = originalItem ? originalItem.quantity : 1;
    let newQuantity = parseInt(newQuantityStr, 10);
    if (isNaN(newQuantity) || newQuantity < originalQuantity) newQuantity = originalQuantity;
    setAmendedItems(items => items.map(item => (item.id === productId ? { ...item, quantity: newQuantity } : item)));
  };
  
  const handleAddProduct = (product: Product) => {
    setAmendedItems(currentItems => {
        const existingItem = currentItems.find(item => item.id === product.id);
        if (existingItem) return currentItems.map(item => item.id === product.id ? {...item, quantity: item.quantity + 1} : item);
        return [...currentItems, {...product, quantity: 1, productId: product.id}];
    });
    setPopoverOpen(false);
  };

  const handleCancelAmendment = async () => {
    await updateOrder({ ...order, isEditable: false });
    toast({ title: 'Amendment Cancelled', description: 'Your order has not been changed.' });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to amend an order.' });
      return;
    }
    
    setIsPending(true);

    const result = await amendOrderAction({
      originalOrder: order,
      amendedItems,
      userData,
    });
    
    if (result.success) {
      toast({ title: "Order Updated Successfully!", description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Update Failed', description: result.message });
    }
    
    setIsPending(false);
  };

  const subtotal = amendedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const sst = amendedItems.reduce((sum, item) => item.hasSst ? sum + (item.price * item.quantity * 0.06) : sum, 0);
  const total = subtotal + sst;
  const unlistedProducts = products.filter(p => !amendedItems.some(item => item.id === p.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow><TableHead>Product</TableHead><TableHead className="w-[120px]">Quantity</TableHead><TableHead className="text-right">Total</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                    {amendedItems.map(item => {
                        const originalItem = order.items.find(i => i.productId === item.id);
                        const minQuantity = originalItem ? originalItem.quantity : 1;
                        return (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>
                                    <Input type="number" value={item.quantity} min={minQuantity} onChange={(e) => handleQuantityChange(item.id, e.target.value)} className="h-8 w-20 text-center" />
                                </TableCell>
                                <TableCell className="text-right">RM {(item.price * item.quantity).toFixed(2)}</TableCell>
                            </TableRow>
                        )
                    })}
                     {amendedItems.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground h-24">This order is empty. Add items to continue.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" disabled={isLoadingProducts}>
                    {isLoadingProducts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add Item
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                 <Command>
                    <CommandInput placeholder="Search products..." />
                    <CommandList>
                        <CommandEmpty>No products found.</CommandEmpty>
                        <CommandGroup>
                        {unlistedProducts.map((product) => (
                            <CommandItem key={product.id} value={product.name} onSelect={() => handleAddProduct(product)}>{product.name}</CommandItem>
                        ))}
                        </CommandGroup>
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
            <Button type="button" variant="ghost" onClick={handleCancelAmendment} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending || amendedItems.length === 0}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
            </Button>
        </div>
    </form>
  );
}
