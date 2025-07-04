
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
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import type { Product } from '@/lib/types';

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
          const existingProductsByName = new Map(productsSnapshot.docs.map(doc => [doc.data().name.toLowerCase(), { ...doc.data(), id: doc.id } as Product]));

          for (const row of results.data as any[]) {
            const productData = {
              name: row.name?.trim(),
              description: row.description?.trim() || '',
              price: parseFloat(row.price),
              unit: ['item', 'kg'].includes(row.unit) ? row.unit : 'item',
              category: row.category?.trim() || 'Uncategorized',
              stock: parseInt(row.stock, 10),
              imageUrl: row.imageUrl?.trim() || 'https://placehold.co/600x400.png',
              hasSst: String(row.hasSst).toLowerCase() === 'true',
            };
            
            if (!productData.name || isNaN(productData.price) || productData.price < 0 || isNaN(productData.stock)) {
              console.warn("Skipping invalid row due to missing name or invalid number:", row);
              continue;
            }

            let docId = row.id?.trim();
            let docRef;

            if (docId && existingProductsById.has(docId)) {
                docRef = doc(db, 'products', docId);
                batch.update(docRef, productData);
                updatedCount++;
            } else if (existingProductsByName.has(productData.name.toLowerCase())) {
                const existingProduct = existingProductsByName.get(productData.name.toLowerCase())!;
                docRef = doc(db, 'products', existingProduct.id);
                batch.update(docRef, productData);
                updatedCount++;
            } else {
                docRef = doc(collection(db, 'products'));
                batch.set(docRef, productData);
                createdCount++;
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

          onImportSuccess();
          setIsOpen(false);
          resetState();

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
            Upload a CSV file to bulk add or edit products. To update an existing product, make sure the 'name' in your CSV matches the product name in the system. The 'id' field is optional.
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
