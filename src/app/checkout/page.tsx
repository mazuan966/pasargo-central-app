'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useOrders } from '@/hooks/use-orders';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Truck, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

type PaymentMethod = 'billplz' | 'cod';
const timeSlots = [
    "2:00 PM - 3:00 PM",
    "3:00 PM - 4:00 PM",
    "4:00 PM - 5:00 PM",
    "5:00 PM - 6:00 PM",
    "6:00 PM - 7:00 PM",
    "7:00 PM - 8:00 PM",
    "8:00 PM - 9:00 PM",
    "9:00 PM - 10:00 PM",
    "10:00 PM - 11:00 PM",
    "11:00 PM - 12:00 AM"
];

export default function CheckoutPage() {
  const { cartItems, cartSubtotal, cartSst, cartTotal, clearCart } = useCart();
  const { addOrder } = useOrders();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('billplz');
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [minDate, setMinDate] = useState<Date>(new Date());
  const [timeSlot, setTimeSlot] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Redirect if cart is empty. This effect runs on the client after mount.
    if (cartItems.length === 0) {
      router.replace('/dashboard');
    }
  }, [cartItems, router]);

  useEffect(() => {
    const now = new Date();
    // Set hours, minutes, seconds, and milliseconds to 0 to compare dates only
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (now.getHours() >= 5) {
      // After 5 AM, delivery is for the next day
      setMinDate(addDays(today, 1));
    } else {
      // Before 5 AM, delivery can be today
      setMinDate(today);
    }
  }, []);

  // Prevent rendering the page content if the cart is empty (while redirecting)
  if (cartItems.length === 0) {
    return null;
  }
  
  const handlePlaceOrder = async () => {
    if (!deliveryDate || !timeSlot) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a delivery date and time slot.',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await addOrder(cartItems, cartSubtotal, cartSst, cartTotal, paymentMethod, deliveryDate.toISOString(), timeSlot);
      toast({
        title: 'Order Placed Successfully!',
        description: 'Thank you for your purchase. A confirmation has been sent via WhatsApp.',
      });
      clearCart();
      router.push('/orders');
    } catch (error) {
      console.error("Failed to place order:", error);
      toast({
        variant: 'destructive',
        title: 'Order Failed',
        description: 'There was a problem placing your order. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
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
                            <div className="flex justify-between">
                                <p>Subtotal</p>
                                <p>RM {cartSubtotal.toFixed(2)}</p>
                            </div>
                            <div className="flex justify-between">
                                <p>SST (6%)</p>
                                <p>RM {cartSst.toFixed(2)}</p>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <p>Total</p>
                                <p>RM {cartTotal.toFixed(2)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Delivery Schedule</CardTitle>
                        <CardDescription>Select your preferred delivery date and time.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="delivery-date">Delivery Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="delivery-date"
                                        variant={"outline"}
                                        className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !deliveryDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {deliveryDate ? format(deliveryDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={deliveryDate}
                                    onSelect={setDeliveryDate}
                                    disabled={(date) => date < minDate}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="time-slot">Time Slot</Label>
                            <Select value={timeSlot} onValueChange={setTimeSlot}>
                                <SelectTrigger id="time-slot">
                                    <SelectValue placeholder="Select a time slot" />
                                </SelectTrigger>
                                <SelectContent>
                                    {timeSlots.map(slot => (
                                        <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
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
                    disabled={isLoading || !deliveryDate || !timeSlot}
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
