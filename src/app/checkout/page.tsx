
'use client';

import { useState, useEffect, useRef } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Calendar as CalendarIcon, Info, XCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { placeOrderAction } from '@/lib/actions';

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
      originalOrderId: amendmentInfo?.originalOrderId,
    });

    if (result.success) {
      toast({ title: 'Success!', description: result.message });
      const finalRedirectUrl = amendmentInfo ? `/orders/${amendmentInfo.originalOrderId}` : '/orders';
      clearCart();
      localStorage.removeItem('amendmentInfo');
      router.push(finalRedirectUrl);
    } else {
      toast({ variant: 'destructive', title: 'Order Failed', description: result.message });
    }
    
    setIsPlacingOrder(false);
  };


  if (cartItems.length === 0) {
    return null;
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
                        {deliveryDate ? format(deliveryDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} disabled={(date) => date < minDate || !!amendmentInfo} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="delivery-time">Delivery Time Slot</Label>
                   {amendmentInfo ? ( <Input id="delivery-time" type="text" value={deliveryTime} readOnly disabled className="cursor-not-allowed bg-muted/50" /> ) : (
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
