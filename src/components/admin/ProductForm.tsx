
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Product as ProductType, ProductVariant } from '@/lib/types';
import { ProductSchema } from '@/lib/types';
import { useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Trash } from 'lucide-react';

type ProductFormValues = Zod.infer<typeof ProductSchema>;

interface ProductFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  product?: ProductType;
  onSubmit: (data: ProductFormValues) => void;
}

const defaultVariant: ProductVariant = {
  id: crypto.randomUUID(),
  name: '',
  price: 0,
  stock: 0,
  unit: 'item',
};

export function ProductForm({ isOpen, setIsOpen, product, onSubmit }: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema),
    defaultValues: product || {
      name: '',
      description: '',
      category: '',
      imageUrl: 'https://placehold.co/600x400.png',
      hasSst: false,
      variants: [defaultVariant],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variants',
    keyName: 'key',
  });

  useEffect(() => {
    if (isOpen) {
        if (product) {
            form.reset(product);
        } else {
            form.reset({
                name: '',
                description: '',
                category: '',
                imageUrl: 'https://placehold.co/600x400.png',
                hasSst: false,
                variants: [defaultVariant],
            });
        }
    }
  }, [product, form, isOpen]);
  
  const handleSubmit = (values: ProductFormValues) => {
    onSubmit(values as ProductType);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {product ? 'Update the details of your product and its variants.' : 'Fill in the details for the new product.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-6 -mr-6">
            <Form {...form}>
            <form id="product-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                <FormItem><FormLabel>Image URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="hasSst" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>Apply SST</FormLabel>
                        <p className="text-sm text-muted-foreground">Apply 6% Sales and Service Tax to this product.</p>
                    </div>
                    </FormItem>
                )} />

                <Separator className="my-6" />

                <div>
                    <h3 className="text-lg font-medium mb-2">Product Variants</h3>
                     {form.formState.errors.variants?.root && <p className="text-sm font-medium text-destructive">{form.formState.errors.variants.root.message}</p>}
                </div>
                
                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.key} className="p-4 border rounded-md relative space-y-4">
                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                <Trash className="h-4 w-4 text-destructive" />
                            </Button>
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField control={form.control} name={`variants.${index}.name`} render={({ field }) => (
                                    <FormItem><FormLabel>Variant Name</FormLabel><FormControl><Input placeholder="e.g., 5kg Bag" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name={`variants.${index}.price`} render={({ field }) => (
                                    <FormItem><FormLabel>Price (RM)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name={`variants.${index}.stock`} render={({ field }) => (
                                    <FormItem><FormLabel>Stock</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name={`variants.${index}.unit`} render={({ field }) => (
                                    <FormItem><FormLabel>Unit</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                            <SelectContent><SelectItem value="item">Item</SelectItem><SelectItem value="kg">Kg</SelectItem></SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )}/>
                             </div>
                        </div>
                    ))}
                </div>

                <Button type="button" variant="outline" onClick={() => append({ ...defaultVariant, id: crypto.randomUUID() })}>
                    Add Another Variant
                </Button>

            </form>
            </Form>
        </div>
        <DialogFooter className="pt-4 flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" form="product-form">Save Product</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
