
'use client';

import { useState, useEffect } from 'react';
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
import { useCart } from '@/hooks/use-cart';
import { useRouter } from 'next/navigation';

export function OrderAmendmentForm({ order }: { order: Order }) {
  const [amendedItems, setAmendedItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  const { updateOrder, amendCodOrder } = useOrders();
  const { addToCart } = useCart();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Initialize with a deep copy of order items, ensuring 'id' is present for CartItem compatibility
    setAmendedItems(JSON.parse(JSON.stringify(order.items.map(item => ({ ...item, id: item.productId })))));

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

  const handleQuantityChange = (productId: string, newQuantityStr: string) => {
    const originalItem = order.items.find(i => i.productId === productId);
    const originalQuantity = originalItem ? originalItem.quantity : 1;
    let newQuantity = parseInt(newQuantityStr, 10);

    if (isNaN(newQuantity) || newQuantity < originalQuantity) {
      newQuantity = originalQuantity;
    }

    setAmendedItems(items =>
      items.map(item => (item.id === productId ? { ...item, quantity: newQuantity } : item))
    );
  };
  
  const handleAddProduct = (product: Product) => {
    setAmendedItems(currentItems => {
        const existingItem = currentItems.find(item => item.id === product.id);
        if (existingItem) {
            return currentItems.map(item => item.id === product.id ? {...item, quantity: item.quantity + 1} : item);
        } else {
            return [...currentItems, {...product, quantity: 1, productId: product.id}];
        }
    });
    setPopoverOpen(false);
  };

  const handleCancelAmendment = async () => {
    await updateOrder({ ...order, isEditable: false });
    toast({ title: 'Amendment Cancelled', description: 'Your order has not been changed.' });
  };
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
        if (order.paymentMethod === 'Cash on Delivery') {
            await amendCodOrder(order, amendedItems);
            toast({ title: "Order Updated Successfully!" });

        } else if (order.paymentMethod === 'Bank Transfer') {
            const originalItemsMap = new Map(order.items.map(i => [i.productId, i.quantity]));
            const itemsToCheckout: CartItem[] = [];

            for (const amendedItem of amendedItems) {
                const originalQty = originalItemsMap.get(amendedItem.id) || 0;
                const addedQty = amendedItem.quantity - originalQty;

                if (addedQty > 0) {
                    const productData = products.find(p => p.id === amendedItem.id);
                    if (productData) {
                        itemsToCheckout.push({ ...productData, quantity: addedQty });
                    }
                }
            }

            if (itemsToCheckout.length > 0) {
                for (const item of itemsToCheckout) {
                    addToCart(item, item.quantity);
                }
                await updateOrder({ ...order, isEditable: false });
                toast({
                    title: 'Items Added to Cart',
                    description: 'Proceed to checkout to complete your additional order.',
                });
                router.push('/checkout');
            } else {
                await updateOrder({ ...order, isEditable: false });
                toast({ title: 'No Changes Made', description: 'Your order amendment has been cancelled.' });
            }
        }
    } catch (e: any) {
        setError(e.message || "An error occurred.");
    } finally {
        setIsSubmitting(false);
    }
  };


  const subtotal = amendedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const sst = amendedItems.reduce((sum, item) => item.hasSst ? sum + (item.price * item.quantity * (item.price * 0.06)) : sum, 0);
  const total = subtotal + sst;
  
  const unlistedProducts = products.filter(p => !amendedItems.some(item => item.id === p.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
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
                <div className="flex justify-between font-bold text-lg">
                  <span>{order.paymentMethod === 'Cash on Delivery' ? 'New Total:' : 'Additional Cost:'}</span>
                  <span>RM {total.toFixed(2)}</span>
                </div>
            </div>
        </div>
        
        {error && (
             <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Update Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        
        <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleCancelAmendment} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || amendedItems.length === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </div>
    </form>
  );
}
