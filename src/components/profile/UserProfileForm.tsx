'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { User } from '@/lib/types';
import { Textarea } from '../ui/textarea';

// This is mock data. In a real app, you'd get this from your auth context.
const mockUser: Omit<User, 'id'> & { email: string } = {
  restaurantName: 'The Daily Grind Cafe',
  personInCharge: 'John Doe',
  address: '123 Jalan Ampang, Menara M1, 50450 Kuala Lumpur, W.P. Kuala Lumpur',
  phoneNumber: '123456789',
  email: 'user@example.com'
};

const profileFormSchema = z.object({
  restaurantName: z.string().min(1, { message: 'Restaurant name is required.' }),
  personInCharge: z.string().min(1, { message: 'Person in charge name is required.' }),
  address: z.string().min(1, { message: 'Address is required.' }),
  phoneNumber: z.string().regex(/^[1-9]\d{7,9}$/, { message: 'Phone number must be 8-10 digits and not start with 0.' }),
  email: z.string().email(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function UserProfileForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<ProfileFormValues>(mockUser);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: user,
  });

  useEffect(() => {
    form.reset(user);
  }, [user, form]);

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true);
    // TODO: Implement actual user data update logic
    console.log('Updated profile data:', data);

    // Mock update
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUser(data);
    
    toast({
      title: 'Profile Updated',
      description: 'Your details have been saved successfully.',
    });
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="restaurantName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Restaurant Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="personInCharge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Person in Charge</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Address</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                    <div className="flex items-center">
                        <span className="inline-flex items-center px-3 h-10 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                        +60
                        </span>
                        <Input 
                            className="rounded-l-none" 
                            placeholder="123456789" 
                            {...field} 
                        />
                    </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Cannot be changed)</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly disabled className="cursor-not-allowed bg-muted/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
