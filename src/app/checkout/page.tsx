
'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Calendar as CalendarIcon, Info, Truck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { PaymentMethod } from '@/lib/types';
import { useLanguage } from '@/context/LanguageProvider';
import { placeOrderAction } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';

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
  const { getTranslated, t, language } = useLanguage();
  const { userData } = useAuth();
  
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
    if (cartItems.length === 0 && !amendmentInfo) {
      router.replace('/dashboard');
    }
  }, [cartItems, router, amendmentInfo]);


  useEffect(() => {
    return () => {
      localStorage.removeItem('amendmentInfo');
    };
  }, []);
  
  const handlePlaceOrder = async () => {
    if (!deliveryDate || !deliveryTime) {
      toast({ variant: 'destructive', title: t('checkout.toast.missing_info_title'), description: t('checkout.toast.missing_info_description') });
      return;
    }
    
    if (!userData) {
      toast({ variant: 'destructive', title: t('checkout.toast.error_title'), description: t('checkout.toast.error_description') });
      return;
    }

    setIsPlacingOrder(true);
    
    try {
        const result = await placeOrderAction({
            cartItems,
            userData,
            deliveryDate: deliveryDate.toISOString(),
            deliveryTimeSlot: deliveryTime,
            language,
            originalOrderId: amendmentInfo?.originalOrderId,
        });

        if (!result.success) {
            throw new Error(result.message);
        }

        clearCart();
        localStorage.removeItem('amendmentInfo');
        
        const successTitle = amendmentInfo ? 'Amendment Confirmed!' : 'Order Placed!';
        toast({ title: successTitle, description: result.message });
        
        const redirectUrl = amendmentInfo ? `/orders/${amendmentInfo.originalOrderId}` : '/orders';
        router.push(redirectUrl);

    } catch(error: any) {
        toast({ variant: 'destructive', title: t('checkout.toast.failed_title'), description: error.message });
    } finally {
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
      <h1 className="text-3xl font-headline font-bold mb-6">{amendmentInfo ? t('checkout.amend_order_title') : t('checkout.title')}</h1>
      
      {amendmentInfo && (
          <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
              <Info className="h-4 w-4 !text-blue-800" />
              <AlertTitle>{t('checkout.amendment_alert_title')}</AlertTitle>
              <AlertDescription dangerouslySetInnerHTML={{ __html: t('checkout.amendment_alert_desc', { orderNumber: amendmentInfo.originalOrderNumber }) }} />
          </Alert>
      )}

      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <Card>
              <CardHeader><CardTitle>{t('cart.summary_title')}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{getTranslated(item, 'name')}</p>
                        <p className="text-sm text-muted-foreground">{item.quantity} x RM {item.price.toFixed(2)}</p>
                      </div>
                      <p>RM {(item.quantity * item.price).toFixed(2)}</p>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between"><p>{t('cart.subtotal')}</p><p>RM {cartSubtotal.toFixed(2)}</p></div>
                  <div className="flex justify-between"><p>{t('cart.sst')}</p><p>RM {cartSst.toFixed(2)}</p></div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg"><p>{t('cart.total')}</p><p>RM {cartTotal.toFixed(2)}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('checkout.delivery_schedule_title')}</CardTitle>
                <CardDescription>{amendmentInfo ? 'Your delivery is scheduled for:' : t('checkout.delivery_schedule_desc')}</CardDescription>
              </Header>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="delivery-date">{t('checkout.delivery_date')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button id="delivery-date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !deliveryDate && "text-muted-foreground")} disabled={!!amendmentInfo}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {deliveryDate ? format(deliveryDate, "dd/MM/yyyy") : <span>{t('checkout.pick_a_date')}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} disabled={(date) => date < minDate || !!amendmentInfo} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="delivery-time">{t('checkout.delivery_time')}</Label>
                   {amendmentInfo ? ( <Select value={deliveryTime} onValueChange={setDeliveryTime} disabled><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value={deliveryTime}>{deliveryTime}</SelectItem></SelectContent></Select> ) : (
                      <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                        <SelectTrigger id="delivery-time">
                          <SelectValue placeholder={t('checkout.select_time')} />
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
                    <CardTitle>{t('checkout.payment_method_title')}</CardTitle>
                    <CardDescription>{t('checkout.payment_method_desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 border rounded-md p-4 bg-muted border-primary">
                        <Truck className="h-6 w-6" />
                        <div>
                            <p className="font-semibold">{t('checkout.cod_title')}</p>
                            <p className="text-sm text-muted-foreground">{t('checkout.cod_desc')}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
             <Button onClick={handlePlaceOrder} disabled={isPlacingOrder || !deliveryDate || !deliveryTime} className="w-full mt-6">
                {isPlacingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPlacingOrder ? t('checkout.processing') : (amendmentInfo ? t('checkout.confirm_amendment') : t('checkout.place_order'))}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
