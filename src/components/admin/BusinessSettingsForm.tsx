'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { BusinessDetails } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

const formSchema = z.object({
  name: z.string().min(1, 'Business name is required.'),
  address: z.string().min(1, 'Address is required.'),
  phone: z.string().min(1, 'Phone number is required.'),
  email: z.string().email('Invalid email address.'),
  tin: z.string().min(1, 'TIN is required.'),
});

type FormValues = z.infer<typeof formSchema>;

const SETTINGS_ID = 'business';

function SettingsSkeleton() {
    return (
        <div className="space-y-4 max-w-2xl">
            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-20 w-full" /></div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
            </div>
             <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-1/2" /></div>
            <Skeleton className="h-10 w-32" />
        </div>
    )
}

export function BusinessSettingsForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: 'Pasargo Central',
      address: 'Jalan Teknologi 5, Taman Teknologi Malaysia, 57000 Kuala Lumpur, Malaysia',
      phone: '+60 12-345 6789',
      email: 'sales@pasargo.com',
      tin: 'TIN-PASARGO-123',
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!db) {
        toast({ title: 'Error', description: 'Database not connected.', variant: 'destructive'});
        setIsFetching(false);
        return;
      }
      setIsFetching(true);
      try {
        const docRef = doc(db, 'settings', SETTINGS_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          form.reset(docSnap.data() as FormValues);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast({ title: 'Error', description: 'Could not fetch business settings.', variant: 'destructive'});
      } finally {
        setIsFetching(false);
      }
    };
    fetchSettings();
  }, [form, toast]);

  async function onSubmit(data: FormValues) {
    if (!db) {
        toast({ title: 'Error', description: 'Database not connected.', variant: 'destructive'});
        return;
    }
    setIsLoading(true);
    try {
      const docRef = doc(db, 'settings', SETTINGS_ID);
      await setDoc(docRef, data, { merge: true });
      toast({ title: 'Success', description: 'Business settings updated successfully.' });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetching) {
      return <SettingsSkeleton />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
        <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Business Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>
        <FormField control={form.control} name="tin" render={({ field }) => (
            <FormItem><FormLabel>Tax Identification Number (TIN)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </form>
    </Form>
  );
}
