
'use client';

import { useState, useEffect } from 'react';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, PlusCircle, Trash, Edit as EditIcon, Loader2, AlertTriangle, CheckCircle, Upload, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProductForm } from '@/components/admin/ProductForm';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ProductImporter } from '@/components/admin/ProductImporter';
import { translateProduct } from '@/ai/flows/translate-product-flow';
import type { Product as ProductSchemaType } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProducts = () => {
    if (!db) {
        setDbError("Firebase is not configured. Cannot fetch products.");
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    const productsCollection = collection(db, "products");
    const q = query(productsCollection, orderBy("name"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const productsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        setProducts(productsList);
        setDbError(null);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching products:", error);
        setDbError("Failed to fetch products from the database.");
        setIsLoading(false);
    });

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchProducts();
    return () => unsubscribe?.();
  }, []);

  const handleAddProduct = () => {
    setSelectedProduct(undefined);
    setIsFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };
  
  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete || !productToDelete.id || !db) return;
    try {
        await deleteDoc(doc(db, 'products', productToDelete.id));
        toast({ title: 'Product Deleted', description: `${productToDelete.name} has been removed.` });
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error Deleting Product', description: error.message });
    }
    setIsDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const handleFormSubmit = async (data: ProductSchemaType) => {
    if (!db) return;
    try {
      let translations = {};
      try {
        translations = await translateProduct({ 
          name: data.name, 
          description: data.description, 
          category: data.category 
        });
      } catch (aiError) {
        console.warn("AI translation failed, saving product without translations.", aiError);
        toast({ variant: "destructive", title: "AI Translation Failed", description: "Could not generate translations, but the product was saved in English." });
      }

      const productData = { ...data, ...translations };

      if (selectedProduct && selectedProduct.id) {
        const productRef = doc(db, 'products', selectedProduct.id);
        await updateDoc(productRef, productData);
        toast({ title: 'Product Updated', description: `${data.name} has been successfully updated.` });
      } else {
        await addDoc(collection(db, 'products'), productData);
        toast({ title: 'Product Added', description: `${data.name} has been successfully added.` });
      }
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error Saving Product', description: error.message });
    }
  };

  const handleExportCSV = () => {
      if (products.length === 0) {
        toast({ title: 'No Products to Export', description: 'There are no products to export.' });
        return;
      }
      
      const headers = [
        'productId', 'productName', 'productDescription', 'category', 'imageUrl', 'hasSst',
        'variantId', 'variantName', 'price', 'stock', 'unit'
      ];
      
      const rows = products.flatMap(p => 
        p.variants.map(v => [
          p.id, p.name, p.description, p.category, p.imageUrl, String(p.hasSst),
          v.id, v.name, v.price, v.stock, v.unit
        ])
      );

      const escapeCsv = (val: any) => {
        if (val === undefined || val === null) return '';
        let str = String(val);
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
            str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsv).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute("download", `products_export_${date}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: 'Export Successful', description: 'Products have been exported to CSV.' });
  };
  

  return (
    <>
      <ProductForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        product={selectedProduct}
        onSubmit={handleFormSubmit}
      />
      <ProductImporter
        isOpen={isImportOpen}
        setIsOpen={setIsImportOpen}
        onImportSuccess={fetchProducts}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product
              "{productToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl">Products</CardTitle>
            <CardDescription>Add, edit, and manage your product inventory and its variants.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={handleAddProduct}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Price Range</TableHead>
                  <TableHead>Total Stock</TableHead>
                  <TableHead>SST (6%)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dbError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                       <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Database Error</AlertTitle>
                          <AlertDescription>{dbError}</AlertDescription>
                       </Alert>
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No products found. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => {
                    const prices = product.variants?.map(v => v.price) || [0];
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;

                    return (
                        <TableRow key={product.id} className="group">
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.category}</Badge>
                          </TableCell>
                          <TableCell>
                            {product.variants?.length || 0}
                          </TableCell>
                          <TableCell>
                            {prices.length > 1 ? `RM ${minPrice.toFixed(2)} - RM ${maxPrice.toFixed(2)}` : `RM ${minPrice.toFixed(2)}`}
                          </TableCell>
                          <TableCell>
                            {totalStock}
                          </TableCell>
                          <TableCell>
                            {product.hasSst && <CheckCircle className="h-5 w-5 text-green-600" />}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                  <EditIcon className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(product)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
