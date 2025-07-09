
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, getDocs, updateDoc, addDoc, query, where } from 'firebase/firestore';
import type { Product, ProductVariant } from '@/lib/types';
import { translateProduct } from '@/ai/flows/translate-product-flow';

interface ProductImporterProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onImportSuccess: () => void;
}

export function ProductImporter({ isOpen, setIsOpen, onImportSuccess }: ProductImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setError(null);
    setIsLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file || !db) return;

    setIsLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const batch = writeBatch(db);
          let createdCount = 0;
          let updatedCount = 0;

          const productsCollection = collection(db, 'products');
          const productsSnapshot = await getDocs(productsCollection);
          const existingProductsById = new Map(productsSnapshot.docs.map(doc => [doc.id, { ...doc.data(), id: doc.id } as Product]));
          
          const productsToTranslate: { docId: string; name: string; description: string }[] = [];
          
          const rowsByProductId = new Map<string, any[]>();
          results.data.forEach((row: any) => {
              const productId = row.productId || row.productName;
              if (!rowsByProductId.has(productId)) {
                  rowsByProductId.set(productId, []);
              }
              rowsByProductId.get(productId)!.push(row);
          });

          for (const [productId, rows] of rowsByProductId.entries()) {
            const firstRow = rows[0];
            const productData = {
                name: firstRow.productName?.trim(),
                description: firstRow.productDescription?.trim() || '',
                category: firstRow.category?.trim() || 'Uncategorized',
                imageUrl: firstRow.imageUrl?.trim() || 'https://placehold.co/600x400.png',
                hasSst: String(firstRow.hasSst).toLowerCase() === 'true',
            };

            if (!productData.name) {
                console.warn("Skipping product due to missing name:", firstRow);
                continue;
            }

            const variants: ProductVariant[] = rows.map(row => ({
                id: row.variantId || crypto.randomUUID(),
                name: row.variantName?.trim(),
                price: parseFloat(row.price),
                stock: parseInt(row.stock, 10),
                unit: ['item', 'kg'].includes(row.unit) ? row.unit : 'item',
            })).filter(v => v.name && !isNaN(v.price) && !isNaN(v.stock));

            if (variants.length === 0) {
                 console.warn("Skipping product due to no valid variants:", firstRow);
                 continue;
            }
            
            let docId = firstRow.productId?.trim();
            let docRef;

            if (docId && existingProductsById.has(docId)) {
                // Update existing product by ID
                docRef = doc(db, 'products', docId);
                batch.update(docRef, { ...productData, variants });
                updatedCount++;
            } else {
                // Check by name if no ID match
                const q = query(collection(db, 'products'), where("name", "==", productData.name));
                const nameMatchSnapshot = await getDocs(q);
                if (!nameMatchSnapshot.empty) {
                    docId = nameMatchSnapshot.docs[0].id;
                    docRef = doc(db, 'products', docId);
                    batch.update(docRef, { ...productData, variants });
                    updatedCount++;
                } else {
                    // Create new product
                    docRef = doc(collection(db, 'products'));
                    docId = docRef.id;
                    batch.set(docRef, { ...productData, variants });
                    createdCount++;
                }
            }
            
            if (docId) {
                productsToTranslate.push({ docId, name: productData.name, description: productData.description });
            }
          }


          if (createdCount === 0 && updatedCount === 0 && results.data.length > 0) {
            setError("No valid products found to import. Please check CSV headers and data.");
            setIsLoading(false);
            return;
          }

          await batch.commit();

          toast({
            title: 'Import Successful',
            description: `${createdCount} products created, ${updatedCount} products updated.`,
          });

          setIsOpen(false);
          resetState();

          if (productsToTranslate.length > 0) {
            toast({
              title: `Translating ${productsToTranslate.length} products...`,
              description: 'AI is generating translations. This may take a moment.',
            });

            const translationPromises = productsToTranslate.map(async (product) => {
              try {
                const translations = await translateProduct({ name: product.name, description: product.description });
                const productRefToUpdate = doc(db, 'products', product.docId);
                await updateDoc(productRefToUpdate, translations);
              } catch (e) {
                console.error(`Failed to translate product ${product.name} (ID: ${product.docId})`, e);
              }
            });

            await Promise.all(translationPromises);

            toast({
              title: 'Translation Complete',
              description: `Finished translating ${productsToTranslate.length} products.`,
            });
          }

          onImportSuccess();

        } catch (err: any) {
          setError(`An error occurred during import: ${err.message}`);
          console.error(err);
          setIsLoading(false);
        }
      },
      error: (err: any) => {
        setError(`Failed to parse CSV file: ${err.message}`);
        setIsLoading(false);
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetState(); setIsOpen(open); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Products via CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with each product variant as a separate row. Include product-level details in each row for that variant. The importer will group by 'productId' or 'productName' to create or update products.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
            {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
            {error && <p className="text-sm text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import Products
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
