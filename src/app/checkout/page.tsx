'use client';

import { useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Truck, Loader2 } from 'lucide-react';

type PaymentMethod = 'billplz' | 'cod';

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('billplz');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  if (cartItems.length === 0 && typeof window !== 'undefined') {
    router.replace('/dashboard');
    return null;
  }
  
  const handlePlaceOrder = async () => {
    setIsLoading(true);

    // In a real application, you would create an order in your database
    // and, if using Billplz, redirect to their payment gateway.
    console.log('Placing order with:', {
      items: cartItems,
      total: cartTotal,
      paymentMethod,
    });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: 'Order Placed Successfully!',
      description: 'Thank you for your purchase. Your order is being processed.',
    });
    
    clearCart();
    router.push('/orders');

    // NOTE: In a real app, you would add the new order to the user's order list.
    // Since we are using static mock data, the new order will not appear in the list.
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
        <h1 className="text-3xl font-headline font-bold mb-6">Checkout</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {cartItems.map(item => (
                                <div key={item.id} className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-sm text-muted-foreground">{item.quantity} x RM {item.price.toFixed(2)}</p>
                                    </div>
                                    <p>RM {(item.quantity * item.price).toFixed(2)}</p>
                                </div>
                            ))}
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <p>Total</p>
                                <p>RM {cartTotal.toFixed(2)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Payment Method</CardTitle>
                        <CardDescription>Choose how you&apos;d like to pay.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup 
                            value={paymentMethod}
                            className="space-y-4"
                            onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}
                        >
                            <Label htmlFor="billplz" className="flex items-center gap-4 border rounded-md p-4 hover:bg-muted/50 cursor-pointer has-[[data-state=checked]]:bg-muted has-[[data-state=checked]]:border-primary">
                                <RadioGroupItem value="billplz" id="billplz" />
                                <CreditCard className="h-6 w-6" />
                                <div>
                                    <p className="font-semibold">FPX Payment (Billplz)</p>
                                    <p className="text-sm text-muted-foreground">Pay securely via online banking.</p>
                                </div>
                            </Label>

                            <Label htmlFor="cod" className="flex items-center gap-4 border rounded-md p-4 hover:bg-muted/50 cursor-pointer has-[[data-state=checked]]:bg-muted has-[[data-state=checked]]:border-primary">
                                <RadioGroupItem value="cod" id="cod" />
                                <Truck className="h-6 w-6" />
                                <div>
                                    <p className="font-semibold">Cash on Delivery (COD)</p>
                                    <p className="text-sm text-muted-foreground">Pay with cash upon delivery.</p>
                                </div>
                            </Label>
                        </RadioGroup>
                    </CardContent>
                </Card>
                <Button 
                    onClick={handlePlaceOrder}
                    disabled={isLoading}
                    className="w-full mt-6"
                >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? 'Placing Order...' : 'Place Order'}
                </Button>
            </div>
        </div>
    </div>
  );
}
