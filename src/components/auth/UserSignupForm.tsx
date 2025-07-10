
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import type { User } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const formSchema = z.object({
  restaurantName: z.string().min(1, { message: 'Restaurant name is required.' }),
  personInCharge: z.string().min(1, { message: 'Person in charge name is required.' }),
  address: z.string().min(1, { message: 'Street address is required.' }),
  buildingName: z.string().optional(),
  postcode: z.string().length(5, { message: 'Postcode must be 5 digits.' }).regex(/^\d+$/, 'Postcode must be numeric.'),
  city: z.string().min(1, { message: 'City is required.' }),
  state: z.string().min(1, { message: 'State is required.' }),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  phoneNumber: z.string().regex(/^[1-9]\d{7,9}$/, { message: 'Phone number must be 8-10 digits and not start with 0.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export function UserSignupForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      restaurantName: '',
      personInCharge: '',
      address: '',
      buildingName: '',
      postcode: '',
      city: '',
      state: '',
      latitude: '',
      longitude: '',
      phoneNumber: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setIsGeolocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          form.setValue('latitude', latitude.toFixed(6));
          form.setValue('longitude', longitude.toFixed(6));
          toast({
            title: 'Location Fetched',
            description: 'Latitude and Longitude fields have been updated.',
          });
          setIsGeolocating(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({
            variant: 'destructive',
            title: 'Could not get location',
            description: error.message,
          });
          setIsGeolocating(false);
        }
      );
    } else {
      toast({
        variant: 'destructive',
        title: 'Geolocation Not Supported',
        description: 'Your browser does not support geolocation.',
      });
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    if (!auth || !db) {
        toast({ variant: 'destructive', title: 'Firebase Not Configured', description: 'Cannot sign up.'});
        setIsLoading(false);
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      const fullAddress = [
        values.address,
        values.buildingName,
        `${values.postcode} ${values.city}`,
        values.state
      ].filter(Boolean).join(', ');

      const userData: Omit<User, 'id'> = {
        email: values.email,
        restaurantName: values.restaurantName,
        personInCharge: values.personInCharge,
        phoneNumber: `+60${values.phoneNumber}`,
        address: fullAddress,
        latitude: values.latitude ? parseFloat(values.latitude) : undefined,
        longitude: values.longitude ? parseFloat(values.longitude) : undefined,
        tin: '',
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      
      toast({
        title: 'Account Created',
        description: "Welcome! You're now being redirected.",
      });
      
      router.push('/dashboard');

    } catch (error: any) {
      console.error("Signup error: ", error);
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.message,
      });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="restaurantName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Restaurant Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., The Daily Grind Cafe" {...field} />
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
                    <Input placeholder="e.g., John Doe" {...field} />
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
              <FormLabel>Street Address</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., 123 Jalan Ampang"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="buildingName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Building Name <span className="text-muted-foreground">(Optional)</span></FormLabel>
              <FormControl>
                <Input placeholder="e.g., Menara M1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="postcode" render={({ field }) => (
                <FormItem>
                    <FormLabel>Postcode</FormLabel>
                    <FormControl><Input placeholder="e.g., 50450" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl><Input placeholder="e.g., Kuala Lumpur" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl><Input placeholder="e.g., W.P. Kuala Lumpur" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
        </div>

        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <FormLabel>Location</FormLabel>
                <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGetLocation}
                disabled={isGeolocating}
                >
                {isGeolocating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <MapPin className="mr-2 h-4 w-4" />
                )}
                Get Current Location
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-normal text-muted-foreground">Latitude</FormLabel>
                        <FormControl>
                        <Input placeholder="Auto-filled" {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-normal text-muted-foreground">Longitude</FormLabel>
                        <FormControl>
                        <Input placeholder="Auto-filled" {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
        </div>

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
              <FormLabel>Email (for login)</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>
      </form>
    </Form>
  );
}
