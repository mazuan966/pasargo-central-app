
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
import { MoreHorizontal, PlusCircle, Trash, Edit as EditIcon, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProductForm } from '@/components/admin/ProductForm';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, FirestoreError } from 'firebase/firestore';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { StockManager } from '@/components/admin/StockManager';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setDbError(null);
      if (!db) {
        setDbError("Firebase is not configured. Please add your credentials to the .env file.");
        setProducts([]);
        setIsLoading(false);
        return;
      }

      try {
        const productsCollection = collection(db, 'products');
        const productSnapshot = await getDocs(productsCollection);
        const productsList = productSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Product[];
        setProducts(productsList);
      } catch (error) {
        if (error instanceof FirestoreError && error.code === 'permission-denied') {
          setDbError("Permission Denied: Your Firestore security rules are preventing access. Please update them in the Firebase console to allow reads on the 'products' collection.");
        } else {
          setDbError("An error occurred while fetching products.");
          console.error(error);
        }
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
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
    if (!productToDelete || !db) return;
    await deleteDoc(doc(db, 'products', productToDelete.id));
    setProducts(products.filter((p) => p.id !== productToDelete.id));
    toast({ title: 'Product Deleted', description: `${productToDelete.name} has been removed.` });
    setIsDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const handleFormSubmit = async (data: Product) => {
    if (!db) {
      toast({ title: 'Error', description: 'Database not configured. Please check your .env file.', variant: 'destructive' });
      setIsFormOpen(false);
      return;
    }

    if (selectedProduct) {
      // Edit
      const productRef = doc(db, 'products', data.id);
      await updateDoc(productRef, { ...data });
      setProducts(products.map((p) => (p.id === data.id ? data : p)));
      toast({ title: 'Product Updated', description: `${data.name} has been updated.` });
    } else {
      // Add
      const { id, ...newProductData } = data;
      const docRef = await addDoc(collection(db, 'products'), newProductData);
      setProducts([{ ...newProductData, id: docRef.id } as Product, ...products]);
      toast({ title: 'Product Added', description: `${data.name} has been created.` });
    }
    setIsFormOpen(false);
    setSelectedProduct(undefined);
  };

  const handleStockUpdate = async (productId: string, quantityToAdd: number) => {
    if (!db) {
        toast({ title: 'Error', description: 'Database not configured.', variant: 'destructive' });
        return;
    }
    const productRef = doc(db, 'products', productId);
    const productToUpdate = products.find(p => p.id === productId);

    if (!productToUpdate) {
        toast({ title: 'Error', description: 'Product not found.', variant: 'destructive' });
        return;
    }

    const newStock = productToUpdate.stock + quantityToAdd;
    
    try {
        await updateDoc(productRef, { stock: newStock });
        setProducts(products.map(p => p.id === productId ? { ...p, stock: newStock } : p));
        toast({ title: 'Stock Updated', description: `Stock for ${productToUpdate.name} is now ${newStock}.` });
    } catch (error) {
        console.error("Stock update error:", error);
        toast({ title: 'Error', description: 'Failed to update stock.', variant: 'destructive' });
    }
  };

  return (
    <>
      <ProductForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        product={selectedProduct}
        onSubmit={handleFormSubmit}
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline text-2xl">Products</CardTitle>
            <CardDescription>Add, edit, and manage your product inventory.</CardDescription>
          </div>
          <Button onClick={handleAddProduct}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Product
          </Button>
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
                  <TableHead>Price</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Stock</TableHead>
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
                  products.map((product) => (
                    <TableRow key={product.id} className="group">
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell>RM {product.price.toFixed(2)}</TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell>
                        <StockManager product={product} onStockUpdate={handleStockUpdate} />
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
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
