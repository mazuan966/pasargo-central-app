
'use client';

import { useState, useEffect, useMemo } from 'react';
import ProductList from '@/components/shop/ProductList';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { AlertTriangle, ShoppingBag, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { StorefrontHeader } from '@/components/layout/StorefrontHeader';
import { StorefrontFooter } from '@/components/layout/StorefrontFooter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageProvider';


// Placeholder data since Firebase is removed
const placeholderProducts: Product[] = [
    {
        id: '1',
        name: 'Fresh Oranges',
        description: 'Juicy and sweet oranges, perfect for juice.',
        category: 'Fruits',
        imageUrl: 'https://placehold.co/600x400.png',
        "data-ai-hint": "orange fruit",
        hasSst: false,
        variants: [{ id: 'v1', name: '1kg Bag', price: 5.99, stock: 50, unit: 'kg' }],
    },
    {
        id: '2',
        name: 'Whole Wheat Bread',
        description: 'Healthy and delicious whole wheat bread.',
        category: 'Bakery',
        imageUrl: 'https://placehold.co/600x400.png',
        "data-ai-hint": "bread loaf",
        hasSst: true,
        variants: [{ id: 'v2', name: 'Loaf', price: 4.50, stock: 30, unit: 'item' }],
    },
     {
        id: '3',
        name: 'Milk',
        description: 'Fresh full-cream milk.',
        category: 'Dairy',
        imageUrl: 'https://placehold.co/600x400.png',
        "data-ai-hint": "milk carton",
        hasSst: false,
        variants: [{ id: 'v3', name: '1L Carton', price: 7.00, stock: 100, unit: 'item' }],
    },
    {
        id: '4',
        name: 'Eggs',
        description: 'Farm-fresh organic eggs.',
        category: 'Dairy',
        imageUrl: 'https://placehold.co/600x400.png',
        "data-ai-hint": "egg carton",
        hasSst: false,
        variants: [{ id: 'v4', name: 'Dozen', price: 12.00, stock: 80, unit: 'item' }],
    }
];

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
  const [dbError, setDbError] = useState<string | null>("Firebase has been removed. Displaying placeholder data.");
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { getTranslated, t } = useLanguage();

  useEffect(() => {
    // Simulate fetching products since Firebase is removed
    setTimeout(() => {
        setProducts(placeholderProducts);
        setIsLoadingProducts(false);
    }, 500);
  }, []);

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
             {uniqueCategories.length > 1 && !isLoadingProducts && (
                <div className="flex flex-wrap gap-2">
                    {uniqueCategories.map(category => {
                        const sampleProduct = products.find(p => p.category === category);
                        const displayText = category === 'All' ? t('categories.all') : (sampleProduct ? getTranslated(sampleProduct, 'category') : category);
                        return (
                          <Button
                              key={category}
                              variant={selectedCategory === category ? 'default' : 'outline'}
                              onClick={() => setSelectedCategory(category)}
                              size="sm"
                          >
                              {displayText}
                          </Button>
                        );
                    })}
                </div>
            )}
        </div>


        {dbError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Database Disconnected</AlertTitle>
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
