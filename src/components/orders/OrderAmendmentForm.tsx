
'use client';

import { useState, useEffect, useActionState } from 'react';
import type { Order, Product, CartItem as OrderItem } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Loader2, XCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { amendOrderAction } from '@/lib/actions';
import { useOrders } from '@/hooks/use-orders';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const SST_RATE = 0.06;

const initialState = {
  success: false,
  message: '',
};

export function OrderAmendmentForm({ order }: { order: Order }) {
  const [amendedItems, setAmendedItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  const { updateOrder } = useOrders();
  const { toast } = useToast();
  
  const [formState, formAction, isPending] = useActionState(amendOrderAction, initialState);

  useEffect(() => {
    // Initialize with a deep copy of order items
    setAmendedItems(JSON.parse(JSON.stringify(order.items.map(item => ({...item, id: item.productId})))));

    const fetchProducts = async () => {
      if (!db) return;
      setIsLoadingProducts(true);
      const productsCollection = collection(db, 'products');
      const productSnapshot = await getDocs(productsCollection);
      const productsList = productSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Product[];
      setProducts(productsList);
      setIsLoadingProducts(false);
    };
    fetchProducts();
  }, [order.items]);
  
  useEffect(() => {
    if (formState.success) {
        toast({ title: "Order Updated Successfully!" });
    }
  }, [formState.success, toast]);

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    const originalItem = order.items.find(i => i.productId === productId);
    const originalQuantity = originalItem ? originalItem.quantity : 1;
    
    const quantity = Math.max(originalQuantity, isNaN(newQuantity) ? originalQuantity : newQuantity);

    setAmendedItems(items =>
      items.map(item => (item.id === productId ? { ...item, quantity } : item))
    );
  };
  
  const handleAddProduct = (product: Product) => {
    setAmendedItems(currentItems => {
        const existingItem = currentItems.find(item => item.id === product.id);
        if (existingItem) {
            return currentItems.map(item => item.id === product.id ? {...item, quantity: item.quantity + 1} : item);
        } else {
            return [...currentItems, {...product, quantity: 1}];
        }
    });
    setPopoverOpen(false);
  };

  const handleCancelAmendment = async () => {
    await updateOrder({ ...order, isEditable: false });
    toast({ title: 'Amendment Cancelled', description: 'Your order has not been changed.' });
  };

  const subtotal = amendedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const sst = amendedItems.reduce((sum, item) => item.hasSst ? sum + (item.price * item.quantity * SST_RATE) : sum, 0);
  const total = subtotal + sst;
  
  const unlistedProducts = products.filter(p => !amendedItems.some(item => item.id === p.id));

  return (
    <form action={formAction} className="space-y-6">
        <input type="hidden" name="orderId" value={order.id} />
        <input type="hidden" name="originalItems" value={JSON.stringify(order.items)} />
        <input type="hidden" name="amendedItems" value={JSON.stringify(amendedItems)} />
      
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-[120px]">Quantity</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {amendedItems.map(item => {
                        const originalItem = order.items.find(i => i.productId === item.id);
                        const minQuantity = originalItem ? originalItem.quantity : 1;
                        return (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        value={item.quantity} 
                                        min={minQuantity}
                                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                                        className="h-8 w-20 text-center"
                                    />
                                </TableCell>
                                <TableCell className="text-right">RM {(item.price * item.quantity).toFixed(2)}</TableCell>
                            </TableRow>
                        )
                    })}
                     {amendedItems.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                This order is empty. Add items to continue.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" disabled={isLoadingProducts}>
                    {isLoadingProducts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Add Item
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                 <Command>
                    <CommandInput placeholder="Search products..." />
                    <CommandList>
                        <CommandEmpty>No products found.</CommandEmpty>
                        <CommandGroup>
                        {unlistedProducts.map((product) => (
                            <CommandItem
                                key={product.id}
                                value={product.name}
                                onSelect={() => handleAddProduct(product)}
                            >
                                {product.name}
                            </CommandItem>
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
                <div className="flex justify-between font-bold text-lg"><span>New Total:</span> <span>RM {total.toFixed(2)}</span></div>
            </div>
        </div>
        
        {!formState.success && formState.message && (
             <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Update Failed</AlertTitle>
                <AlertDescription>{formState.message}</AlertDescription>
            </Alert>
        )}
        
        <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleCancelAmendment} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending || amendedItems.length === 0}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </div>
    </form>
  );
}
