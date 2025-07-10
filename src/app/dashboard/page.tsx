
'use client';

import { useState, useEffect, useMemo } from 'react';
import ProductList from '@/components/shop/ProductList';
import type { Order, Product } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, AlertTriangle, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/context/LanguageProvider';
import { db } from '@/lib/firebase';
import { collection, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useOrders } from '@/hooks/use-orders';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { getTranslated, t } = useLanguage();
  const { orders } = useOrders();
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return; // Wait for auth to be ready

    if (!db) {
      setDbError("Firebase is not configured. Cannot fetch products.");
      setIsLoadingProducts(false);
      return;
    }

    const productsCollection = collection(db, 'products');
    const q = query(productsCollection, orderBy("name"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(productsData);
      setIsLoadingProducts(false);
      setDbError(null);
    }, (error) => {
      console.error("Error fetching products:", error);
      setDbError("Could not fetch products from the database.");
      setIsLoadingProducts(false);
    });

    return () => unsubscribe();
  }, [authLoading]);
  
  const uniqueCategories = useMemo(() => {
    if (products.length === 0) return [];
    return ['All', ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch = getTranslated(product, 'name').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, searchTerm, selectedCategory, getTranslated]);
  
  const actionRequiredOrders = useMemo(() => {
      return orders.filter(o => ['Processing', 'Awaiting Payment'].includes(o.status));
  }, [orders]);

  const isLoading = isLoadingProducts || authLoading;

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-headline font-bold">{t('dashboard.welcome')}</h1>
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
                    <CardTitle className="font-headline text-2xl">{t('dashboard.action_required')}</CardTitle>
                    <CardDescription>{t('dashboard.action_required_desc')}</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href="/orders">
                        {t('dashboard.view_all_orders')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
              {actionRequiredOrders.length > 0 ? (
                <div className="space-y-2">
                  {actionRequiredOrders.map(order => (
                    <div key={order.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                        <p>Order #{order.orderNumber}</p>
                        <p>{order.status}</p>
                        <Button asChild size="sm" variant="ghost">
                            <Link href={`/orders/${order.id}`}>View</Link>
                        </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">{t('dashboard.no_actions')}</p>
              )}
            </CardContent>
        </Card>

        <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h2 className="text-2xl font-headline font-bold">{t('dashboard.products')}</h2>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('dashboard.search_products')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {uniqueCategories.length > 1 && !isLoading && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {uniqueCategories.map(category => {
                        const sampleProduct = products.find(p => p.category === category);
                        const displayText = category === 'All' ? t('categories.all') : (sampleProduct ? getTranslated(sampleProduct, 'category') : category);
                        return (
                            <Button
                                key={category}
                                variant={selectedCategory === category ? 'default' : 'outline'}
                                onClick={() => setSelectedCategory(category)}
                            >
                                {displayText}
                            </Button>
                        );
                    })}
                </div>
            )}

            {isLoading ? (
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
