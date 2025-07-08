
'use client';

import { useState, useEffect, useMemo } from 'react';
import ProductList from '@/components/shop/ProductList';
import { useOrders } from '@/hooks/use-orders';
import { useAuth } from '@/hooks/use-auth';
import { OrderListItem } from '@/components/orders/OrderListItem';
import type { Order, Product } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, AlertTriangle, Search } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, FirestoreError } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

export default function DashboardPage() {
  const { orders } = useOrders();
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    if (!db) {
      setDbError("Firebase is not configured. Please check your credentials.");
      setIsLoadingProducts(false);
      setProducts([]);
      return;
    }
    
    setDbError(null);
    const productsCollection = collection(db, 'products');
    const unsubscribe = onSnapshot(productsCollection, (snapshot) => {
      const productsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(productsList);
      setIsLoadingProducts(false);
    }, (error: FirestoreError) => {
        if (error instanceof FirestoreError && error.code === 'permission-denied') {
          setDbError("Permission Denied: Your Firestore security rules are preventing access. Please update them in the Firebase console to allow reads on the 'products' collection.");
        } else {
          setDbError("An error occurred while fetching products.");
          console.error("Error fetching products: ", error);
        }
        setIsLoadingProducts(false);
    });

    return () => unsubscribe();
  }, []);

  const userOrders = orders
    .filter(o => o.user.id === currentUser?.uid && o.status !== 'Awaiting Payment')
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  
  const recentOrders = userOrders.filter(order => order.status === 'Processing' || order.status === 'Order Created' || order.paymentStatus === 'Pending Payment');
  
  const categories = useMemo(() => {
    if (products.length === 0) return [];
    return ['All', ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-headline font-bold">Welcome to your Dashboard</h1>
        </div>

        {dbError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Database Error</AlertTitle>
            <AlertDescription>
              {dbError}
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
                    <p className="text-muted-foreground text-center py-8">{!dbError ? "You have no orders requiring attention." : "Order data is unavailable."}</p>
                )}
            </CardContent>
        </Card>

        <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h2 className="text-2xl font-headline font-bold">Products</h2>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {categories.length > 1 && !isLoadingProducts && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {categories.map(category => (
                        <Button
                            key={category}
                            variant={selectedCategory === category ? 'default' : 'outline'}
                            onClick={() => setSelectedCategory(category)}
                        >
                            {category}
                        </Button>
                    ))}
                </div>
            )}

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
            ) : filteredProducts.length > 0 ? (
              <ProductList products={filteredProducts} />
            ) : (
              <div className="text-center py-10 text-muted-foreground border-dashed border-2 rounded-lg bg-muted/50">
                  No products match your search criteria.
              </div>
            )}
        </div>
    </div>
  );
}
