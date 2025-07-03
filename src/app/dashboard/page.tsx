'use client';

import { useState, useEffect } from 'react';
import ProductList from '@/components/shop/ProductList';
import { useOrders } from '@/hooks/use-orders';
import { OrderListItem } from '@/components/orders/OrderListItem';
import type { Order, Product } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, WifiOff } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function DashboardPage() {
  const { orders } = useOrders();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isDbConfigured, setIsDbConfigured] = useState(true);

  useEffect(() => {
    if (!db) {
      setIsDbConfigured(false);
      setIsLoadingProducts(false);
      setProducts([]);
      return;
    }
    
    setIsDbConfigured(true);
    const productsCollection = collection(db, 'products');
    const unsubscribe = onSnapshot(productsCollection, (snapshot) => {
      const productsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(productsList);
      setIsLoadingProducts(false);
    }, (error) => {
        console.error("Error fetching products: ", error);
        setIsLoadingProducts(false);
    });

    return () => unsubscribe();
  }, []);

  const userOrders = orders
    .filter(o => o.user.id === 'user-01')
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  
  const recentOrders = userOrders.filter(order => order.status === 'Processing' || order.status === 'Order Created' || order.paymentStatus === 'Pending Payment' || order.paymentStatus === 'Pending Confirmation');

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-headline font-bold">Welcome to your Dashboard</h1>
        </div>

        {!isDbConfigured && (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertTitle>Database Not Configured</AlertTitle>
            <AlertDescription>
              The application is not connected to Firebase. Please configure your credentials in the .env file to see live data.
            </AlertDescription>
          </Alert>
        )}

        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-x-4">
                <div>
                    <CardTitle className="font-headline text-2xl">Action Required</CardTitle>
                    <CardDescription>Orders that are processing or pending payment.</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href="/orders">
                        View All Orders
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                {recentOrders.length > 0 ? (
                    <div className="divide-y">
                        {recentOrders.map((order: Order) => (
                            <OrderListItem key={order.id} order={order} />
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">{ isDbConfigured ? "You have no orders requiring attention." : "Order data is unavailable."}</p>
                )}
            </CardContent>
        </Card>

        <div>
            <div className="flex items-center mb-6">
                <h2 className="text-2xl font-headline font-bold">Products</h2>
            </div>
            {isLoadingProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="p-0">
                      <Skeleton className="aspect-video w-full" />
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-5 w-1/2 mt-2" />
                    </CardContent>
                    <CardFooter className="p-4">
                      <Skeleton className="h-10 w-full" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <ProductList products={products} />
            )}
        </div>
    </div>
  );
}
