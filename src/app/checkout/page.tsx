'use client';

import { useState, useEffect, useActionState, useRef } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Truck, Loader2, Calendar as CalendarIcon, Info, XCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { placeOrderAction } from '@/lib/actions';

type PaymentMethod = 'toyyibpay' | 'cod';

interface AmendmentInfo {
    originalOrderId: string;
    originalOrderNumber: string;
    deliveryDate: string;
    deliveryTimeSlot: string;
}

const initialFormState = { success: false, message: '' };

export default function CheckoutPage() {
  const { cartItems, cartSubtotal, cartSst, cartTotal, clearCart } = useCart();
  const { userData, loading: isAuthLoading } = useAuth();
  const [state, formAction, isPending] = useActionState(placeOrderAction, initialFormState);
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('toyyibpay');
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [minDate, setMinDate] = useState<Date>(new Date());
  const [deliveryTime, setDeliveryTime] = useState<string>('');
  const [amendmentInfo, setAmendmentInfo] = useState<AmendmentInfo | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

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
    if (state.success) {
      if (state.redirectUrl) {
        clearCart();
        localStorage.removeItem('amendmentInfo');
        window.location.href = state.redirectUrl;
      } else {
        toast({ title: 'Success!', description: state.message });
        const finalRedirectUrl = amendmentInfo ? `/orders/${amendmentInfo.originalOrderId}` : '/orders';
        clearCart();
        localStorage.removeItem('amendmentInfo');
        router.push(finalRedirectUrl);
      }
    } else if (state.message) {
      toast({ variant: 'destructive', title: 'Order Failed', description: state.message });
    }
  }, [state, router, toast, clearCart, amendmentInfo]);

  useEffect(() => {
    return () => {
      localStorage.removeItem('amendmentInfo');
    };
  }, []);

  if (cartItems.length === 0) {
    return null;
  }
  
  return (
    <div className="container mx-auto max-w-4xl py-8">
      <h1 className="text-3xl font-headline font-bold mb-6">{amendmentInfo ? 'Pay for Additional Items' : 'Checkout'}</h1>
      
      {amendmentInfo && (
          <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
              <Info className="h-4 w-4 !text-blue-800" />
              <AlertTitle>Order Amendment</AlertTitle>
              <AlertDescription>
                  You are paying for additional items for order <strong>#{amendmentInfo.originalOrderNumber}</strong>. These items will be delivered with your original order.
              </AlertDescription>
          </Alert>
      )}

      <form ref={formRef} action={formAction}>
        {/* Hidden fields to pass data to server action */}
        <input type="hidden" name="items" value={JSON.stringify(cartItems)} />
        <input type="hidden" name="subtotal" value={cartSubtotal} />
        <input type="hidden" name="sst" value={cartSst} />
        <input type="hidden" name="total" value={cartTotal} />
        <input type="hidden" name="paymentMethod" value={paymentMethod} />
        <input type="hidden" name="deliveryDate" value={deliveryDate?.toISOString()} />
        <input type="hidden" name="deliveryTimeSlot" value={deliveryTime} />
        <input type="hidden" name="userData" value={JSON.stringify(userData)} />
        {amendmentInfo && <input type="hidden" name="originalOrderId" value={amendmentInfo.originalOrderId} />}

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
                  <Label htmlFor="delivery-time">Delivery Time</Label>
                   {amendmentInfo ? ( <Input id="delivery-time" type="text" value={deliveryTime} readOnly disabled className="cursor-not-allowed bg-muted/50" /> ) : (
                      <Input id="delivery-time" type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} className="w-full" min="10:00" />
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>{amendmentInfo ? 'Choose a payment method for the additional amount.' : "Choose how you'd like to pay."}</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} className="space-y-4" onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                  <Label htmlFor="toyyibpay" className="flex items-center gap-4 border rounded-md p-4 hover:bg-muted/50 cursor-pointer has-[[data-state=checked]]:bg-muted has-[[data-state=checked]]:border-primary">
                    <RadioGroupItem value="toyyibpay" id="toyyibpay" /><CreditCard className="h-6 w-6" />
                    <div><p className="font-semibold">FPX Payment (Toyyibpay)</p><p className="text-sm text-muted-foreground">Pay securely via online banking.</p></div>
                  </Label>
                  <Label htmlFor="cod" className="flex items-center gap-4 border rounded-md p-4 hover:bg-muted/50 cursor-pointer has-[[data-state=checked]]:bg-muted has-[[data-state=checked]]:border-primary">
                    <RadioGroupItem value="cod" id="cod" /><Truck className="h-6 w-6" />
                    <div><p className="font-semibold">Cash on Delivery (COD)</p><p className="text-sm text-muted-foreground">Pay with cash upon delivery.</p></div>
                  </Label>
                </RadioGroup>
              </CardContent>
            </Card>
             <Button type="submit" disabled={isPending || !deliveryDate || !deliveryTime || isAuthLoading} className="w-full mt-6">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Processing...' : (amendmentInfo ? 'Pay & Add to Order' : 'Place Order')}
            </Button>
             {!state.success && state.message && (
                <Alert variant="destructive" className="mt-4">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
