
'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import { useOrders } from '@/hooks/use-orders';
import { OrderDetails } from '@/components/orders/OrderDetails';
import { Loader2, ArrowLeft, Printer, FileEdit, QrCode, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DeliveryVerification } from '@/components/orders/DeliveryVerification';
import { OrderAmendmentForm } from '@/components/orders/OrderAmendmentForm';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useFormState } from 'react-dom';
import { generateEInvoiceAction } from '@/lib/actions';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const initialState = {
  success: false,
  message: '',
};

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { orders } = useOrders();
  const order = orders.find(o => o.id === params.id);
  const { t } = useLanguage();
  const { toast } = useToast();

  const [eInvoiceState, eInvoiceFormAction] = useFormState(generateEInvoiceAction, initialState);
  
  useEffect(() => {
    if (eInvoiceState.message) {
      toast({
        title: eInvoiceState.success ? "E-Invoice Generated" : "E-Invoice Failed",
        description: eInvoiceState.message,
        variant: eInvoiceState.success ? "default" : "destructive",
      });
    }
  }, [eInvoiceState, toast]);

  if (orders.length > 0 && !order) {
    return notFound();
  }

  if (!order) {
    return (
      <div className="flex w-full justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleAmendOrder = () => {
    localStorage.setItem('amendmentInfo', JSON.stringify({
      originalOrderId: order.id,
      originalOrderNumber: order.orderNumber,
      deliveryDate: order.deliveryDate,
      deliveryTimeSlot: order.deliveryTimeSlot,
    }));
    router.push('/dashboard');
  }

  const isAmendable = order.status !== 'Completed' && order.status !== 'Delivered' && order.status !== 'Cancelled';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/orders">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('order_details.back_button')}
          </Link>
        </Button>
        <div className="flex items-center gap-2">
           {isAmendable && order.isEditable && (
            <Button size="sm" onClick={handleAmendOrder}>
                <FileEdit className="mr-2 h-4 w-4" />
                {t('order_details.amend_order_title')}
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/print/invoice/${order.id}`} target="_blank">
              <Printer className="h-4 w-4 mr-2" />
              {t('order_details.print_invoice_button')}
            </Link>
          </Button>
        </div>
      </div>
      
      <OrderDetails order={order} />

      {order.status === 'Delivered' && (
        <Card>
            <CardHeader>
                <CardTitle>{t('order_details.delivery_verification_title')}</CardTitle>
                <CardDescription>
                  {order.deliveryVerification 
                    ? t('order_details.delivery_verification_description_completed')
                    : t('order_details.delivery_verification_description_pending')
                  }
                </CardDescription>
            </CardHeader>
            <CardContent>
                <DeliveryVerification order={order} />
            </CardContent>
        </Card>
      )}

      {order.status === 'Completed' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('order_details.e_invoice_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {order.eInvoice ? (
                <div className="space-y-4">
                  <Alert>
                    <QrCode className="h-4 w-4" />
                    <AlertTitle>LHDN Validated</AlertTitle>
                    <AlertDescription>
                      This order has a validated e-invoice from the LHDN MyInvois system.
                    </AlertDescription>
                  </Alert>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><strong>Invoice ID:</strong> {order.eInvoice.invoiceId}</div>
                        <div><strong>Validated At:</strong> {format(new Date(order.eInvoice.validatedAt), 'dd/MM/yyyy HH:mm')}</div>
                        <div className="md:col-span-2"><strong>Validation URL:</strong> <a href={order.eInvoice.validationUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline break-all">{order.eInvoice.validationUrl}</a></div>
                        <div className="md:col-span-2 space-y-2">
                          <strong>QR Code:</strong>
                          <div className="w-32 h-32 relative border p-1 rounded-md">
                            <Image 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(order.eInvoice.qrCodeData)}`} 
                              alt="E-Invoice QR Code"
                              fill
                              className="object-contain"
                            />
                          </div>
                        </div>
                    </div>
                </div>
            ) : (
                <form action={eInvoiceFormAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <div className="flex items-center justify-between">
                        <p className="text-muted-foreground">{t('order_details.generate_e_invoice_description')}</p>
                        <Button type="submit">
                          <QrCode className="mr-2 h-4 w-4" />
                          Generate E-Invoice
                        </Button>
                    </div>
                </form>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
