
'use client';

import { useState, useEffect, useMemo } from 'react';
import ProductList from '@/components/shop/ProductList';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { AlertTriangle, ShoppingBag, Search } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, FirestoreError } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { StorefrontHeader } from '@/components/layout/StorefrontHeader';
import { StorefrontFooter } from '@/components/layout/StorefrontFooter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageProvider';

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
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
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { getTranslated, t } = useLanguage();

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
        if (error.code === 'permission-denied') {
          setDbError("Permission Denied: Your Firestore security rules are preventing access. Please update them in the Firebase console to allow reads on the 'products' collection.");
        } else {
          setDbError("An error occurred while fetching products.");
          console.error("Error fetching products: ", error);
        }
        setIsLoadingProducts(false);
    });

    return () => unsubscribe();
  }, []);

  const categories = useMemo(() => {
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <StorefrontHeader />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-2 mb-8">
            <h1 className="text-3xl lg:text-4xl font-headline font-bold">{t('home.title')}</h1>
            <p className="text-lg text-muted-foreground">{t('home.subtitle')}</p>
        </div>

        <div className="flex flex-col gap-4 mb-8">
            <div className="relative flex-grow">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder={t('home.search_placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-base"
                />
            </div>
             {categories.length > 1 && !isLoadingProducts && (
                <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                        <Button
                            key={category}
                            variant={selectedCategory === category ? 'default' : 'outline'}
                            onClick={() => setSelectedCategory(category)}
                            size="sm"
                        >
                            {category}
                        </Button>
                    ))}
                </div>
            )}
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

        {isLoadingProducts ? (
          <ProductGridSkeleton />
        ) : filteredProducts.length > 0 ? (
          <ProductList products={filteredProducts} />
        ) : !dbError ? (
          <div className="text-center py-20 border-dashed border-2 rounded-lg bg-muted/50">
            <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
            <h2 className="mt-4 text-2xl font-semibold">{t('home.no_products_title')}</h2>
            <p className="mt-2 text-muted-foreground">{t('home.no_products_subtitle')}</p>
          </div>
        ) : null}
      </main>
      <StorefrontFooter />
    </div>
  );
}
