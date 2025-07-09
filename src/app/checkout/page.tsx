
'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Calendar as CalendarIcon, Info, CreditCard, Truck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { placeOrderAction } from '@/lib/actions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { PaymentMethod } from '@/lib/types';

interface AmendmentInfo {
    originalOrderId: string;
    originalOrderNumber: string;
    deliveryDate: string;
    deliveryTimeSlot: string;
}

const timeSlots = [
    "10:00 AM - 11:00 AM",
    "11:00 AM - 12:00 PM",
    "12:00 PM - 1:00 PM",
    "1:00 PM - 2:00 PM",
    "2:00 PM - 3:00 PM",
    "3:00 PM - 4:00 PM",
    "4:00 PM - 5:00 PM",
    "5:00 PM - 6:00 PM",
    "6:00 PM - 7:00 PM",
    "7:00 PM - 8:00 PM",
    "8:00 PM - 9:00 PM",
    "9:00 PM - 10:00 PM",
];

export default function CheckoutPage() {
  const { cartItems, cartSubtotal, cartSst, cartTotal, clearCart } = useCart();
  const { userData, loading: isAuthLoading } = useAuth();
  
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [minDate, setMinDate] = useState<Date>(new Date());
  const [deliveryTime, setDeliveryTime] = useState<string>('');
  const [amendmentInfo, setAmendmentInfo] = useState<AmendmentInfo | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('FPX (Toyyibpay)');
  
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const storedInfo = localStorage.getItem('amendmentInfo');
    if (storedInfo) {
      const parsedInfo: AmendmentInfo = JSON.parse(storedInfo);
      setAmendmentInfo(parsedInfo);
      setDeliveryDate(new Date(parsedInfo.deliveryDate));
      setDeliveryTime(parsedInfo.deliveryTimeSlot);
    }
  }, []);

  useEffect(() => {
    if (!amendmentInfo) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (now.getHours() >= 5) {
            setMinDate(addDays(today, 1));
        } else {
            setMinDate(today);
        }
    }
  }, [amendmentInfo]);

  useEffect(() => {
    if (!isPlacingOrder && cartItems.length === 0 && !amendmentInfo) {
      router.replace('/dashboard');
    }
  }, [cartItems, isPlacingOrder, router, amendmentInfo]);


  useEffect(() => {
    return () => {
      localStorage.removeItem('amendmentInfo');
    };
  }, []);
  
  const handlePlaceOrder = async () => {
    if (!deliveryDate || !deliveryTime) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select delivery details.' });
      return;
    }
    if (!userData) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not logged in.' });
      return;
    }

    setIsPlacingOrder(true);
    
    const result = await placeOrderAction({
      items: cartItems,
      subtotal: cartSubtotal,
      sst: cartSst,
      total: cartTotal,
      deliveryDate: deliveryDate.toISOString(),
      deliveryTimeSlot: deliveryTime,
      userData: userData,
      paymentMethod: paymentMethod,
    });

    if (result.success) {
      clearCart();
      localStorage.removeItem('amendmentInfo');
      
      if (result.paymentUrl) {
        // Redirect to external Toyyibpay URL
        window.location.href = result.paymentUrl;
      } else {
        // Handle COD success
        toast({ title: 'Success!', description: result.message });
        router.push(result.orderId ? `/orders/${result.orderId}` : '/orders');
      }
    } else {
      toast({ variant: 'destructive', title: 'Order Failed', description: result.message });
      setIsPlacingOrder(false);
    }
  };


  if (cartItems.length === 0) {
    return (
       <div className="flex w-full justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-4xl py-8">
      <h1 className="text-3xl font-headline font-bold mb-6">{amendmentInfo ? 'Amend Your Order' : 'Checkout'}</h1>
      
      {amendmentInfo && (
          <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
              <Info className="h-4 w-4 !text-blue-800" />
              <AlertTitle>Order Amendment</AlertTitle>
              <AlertDescription>
                  You are amending order <strong>#{amendmentInfo.originalOrderNumber}</strong>. The changes will be delivered with your original order.
              </AlertDescription>
          </Alert>
      )}

      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <Card>
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
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
                  <div className="flex justify-between"><p>Subtotal</p><p>RM {cartSubtotal.toFixed(2)}</p></div>
                  <div className="flex justify-between"><p>SST (6%)</p><p>RM {cartSst.toFixed(2)}</p></div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg"><p>Total</p><p>RM {cartTotal.toFixed(2)}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Schedule</CardTitle>
                <CardDescription>{amendmentInfo ? 'Your delivery is scheduled for:' : 'Select your preferred delivery date and time.'}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="delivery-date">Delivery Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button id="delivery-date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !deliveryDate && "text-muted-foreground")} disabled={!!amendmentInfo}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {deliveryDate ? format(deliveryDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} disabled={(date) => date < minDate || !!amendmentInfo} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="delivery-time">Delivery Time Slot</Label>
                   {amendmentInfo ? ( <Select value={deliveryTime} onValueChange={setDeliveryTime} disabled><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value={deliveryTime}>{deliveryTime}</SelectItem></SelectContent></Select> ) : (
                      <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                        <SelectTrigger id="delivery-time">
                          <SelectValue placeholder="Select a time slot" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(slot => (
                            <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                    <CardDescription>Choose how you'd like to pay.</CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup 
                        value={paymentMethod}
                        className="space-y-4"
                        onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}
                    >
                        <Label htmlFor="cod" className="flex items-center gap-4 border rounded-md p-4 hover:bg-muted/50 cursor-pointer has-[[data-state=checked]]:bg-muted has-[[data-state=checked]]:border-primary">
                            <RadioGroupItem value="Cash on Delivery" id="cod" />
                            <Truck className="h-6 w-6" />
                            <div>
                                <p className="font-semibold">Cash on Delivery (COD)</p>
                                <p className="text-sm text-muted-foreground">Pay with cash upon delivery.</p>
                            </div>
                        </Label>
                        <Label htmlFor="fpx" className="flex items-center gap-4 border rounded-md p-4 hover:bg-muted/50 cursor-pointer has-[[data-state=checked]]:bg-muted has-[[data-state=checked]]:border-primary">
                            <RadioGroupItem value="FPX (Toyyibpay)" id="fpx" />
                            <CreditCard className="h-6 w-6" />
                            <div>
                                <p className="font-semibold">FPX Payment (Toyyibpay)</p>
                                <p className="text-sm text-muted-foreground">Pay securely via online banking.</p>
                            </div>
                        </Label>
                    </RadioGroup>
                </CardContent>
            </Card>
             <Button onClick={handlePlaceOrder} disabled={isPlacingOrder || !deliveryDate || !deliveryTime || isAuthLoading} className="w-full mt-6">
                {isPlacingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPlacingOrder ? 'Processing...' : (amendmentInfo ? 'Confirm Amendment' : 'Place Order')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
