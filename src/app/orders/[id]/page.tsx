
'use client';

import { OrderDetails } from '@/components/orders/OrderDetails';
import { DeliveryVerification } from '@/components/orders/DeliveryVerification';
import { useOrders } from '@/hooks/use-orders';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Loader2, Printer, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useMemo, useTransition } from 'react';
import { generateEInvoiceAction } from '@/lib/actions';
import type { Order, EInvoice, BusinessDetails } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OrderAmendmentForm } from '@/components/orders/OrderAmendmentForm';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/LanguageProvider';

type EInvoiceFormState = {
    success: boolean;
    message: string;
}

// NOTE: By defining these components outside of OrderDetailsPage, we prevent them
// from being re-created on every render, which is a key part of fixing the infinite loop.

function EInvoiceDisplay({ eInvoice }: { eInvoice: EInvoice }) {
    const [isMounted, setIsMounted] = useState(false);
    const { t } = useLanguage();
    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <Card>
            <CardHeader>
            <CardTitle>{t('order_details.e_invoice_title')}</CardTitle>
            <CardDescription>{t('order_details.e_invoice_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
            <p><strong>Invoice ID:</strong> {eInvoice.invoiceId}</p>
            <p><strong>Status:</strong> <span className="font-semibold text-green-700">{eInvoice.status}</span></p>
            <p><strong>Validated At:</strong> {isMounted ? new Date(eInvoice.validatedAt).toLocaleString() : ''}</p>
            <div className="pt-2">
                <p className="font-semibold">QR Code Data:</p>
                <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                <code>{eInvoice.qrCodeData}</code>
                </pre>
            </div>
            <Button variant="link" asChild className="p-0 h-auto">
                <a href={eInvoice.validationUrl} target="_blank" rel="noopener noreferrer">View on MyInvois Portal</a>
            </Button>
            </CardContent>
        </Card>
    );
}

function EInvoiceGenerator({ order }: { order: Order }) {
  const [formState, setFormState] = useState<EInvoiceFormState | undefined>();
  const [isPending, startTransition] = useTransition();
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
      const fetchBusinessDetails = async () => {
        if (!db) {
            setIsLoadingDetails(false);
            return
        };
        setIsLoadingDetails(true);
        try {
            const docRef = doc(db, 'settings', 'business');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setBusinessDetails(docSnap.data() as BusinessDetails);
            }
        } catch (error) {
            console.error("Could not fetch business details for e-invoice", error);
        } finally {
            setIsLoadingDetails(false);
        }
      };
      fetchBusinessDetails();
  }, []);

  if (isLoadingDetails) {
      return (
          <Card>
              <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                  <Skeleton className="h-10 w-40" />
              </CardContent>
          </Card>
      )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('order_details.generate_e_invoice_title')}</CardTitle>
        <CardDescription>{t('order_details.generate_e_invoice_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
                const result = await generateEInvoiceAction(undefined, formData);
                setFormState(result);
            });
        }}>
            <input type="hidden" name="orderDocId" value={order.id} />
            <input type="hidden" name="orderId" value={order.orderNumber} />
            <input type="hidden" name="orderDate" value={order.orderDate} />
            <input type="hidden" name="total" value={order.total} />
            <input type="hidden" name="items" value={JSON.stringify(order.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })))} />
            <input type="hidden" name="seller" value={JSON.stringify({ name: businessDetails?.name || 'Pasargo Central', tin: businessDetails?.tin || 'TIN-NOT-SET' })} />
            <input type="hidden" name="buyer" value={JSON.stringify({ name: order.user.restaurantName, tin: order.user.tin, address: order.user.address })} />
            
            <Button type="submit" disabled={isPending || !businessDetails}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Generate & Validate
            </Button>
        </form>
         {formState && !formState.success && (
            <Alert variant="destructive" className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formState.message}</AlertDescription>
            </Alert>
          )}
          {formState && formState.success && (
            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{formState.message}</AlertDescription>
            </Alert>
          )}
      </CardContent>
    </Card>
  );
}

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const { orders } = useOrders();
  const { t } = useLanguage();

  const order = useMemo(() => orders.find(o => o.id === params.id), [orders, params.id]);

  if (orders.length > 0 && !order) {
    notFound();
    return null;
  }

  if (!order) {
    return (
      <div className="flex w-full justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const canGenerateEInvoice = (order.status === 'Completed' || order.status === 'Delivered');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm" className="mb-4">
          <Link href="/orders" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('order_details.back_button')}
          </Link>
        </Button>
        <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/print/invoice/${order.id}`} target="_blank">
                <Printer className="mr-2 h-4 w-4" />
                {t('order_details.print_invoice_button')}
              </Link>
            </Button>
        </div>
      </div>

      {order.isEditable && (
        <Card>
          <CardHeader>
            <CardTitle>{t('order_details.amend_order_title')}</CardTitle>
            <CardDescription>{t('order_details.amend_order_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <OrderAmendmentForm order={order} />
          </CardContent>
        </Card>
      )}
      
      <OrderDetails order={order} />

      {canGenerateEInvoice && !order.eInvoice && <EInvoiceGenerator order={order} />}
      {order.eInvoice && <EInvoiceDisplay eInvoice={order.eInvoice} />}

      {(order.status === 'Delivered' || order.status === 'Completed') && (
        <Card>
            <CardHeader>
                <CardTitle>{t('order_details.delivery_verification_title')}</CardTitle>
                <CardDescription>
                    {order.deliveryVerification 
                        ? t('order_details.delivery_verification_description_completed')
                        : t('order_details.delivery_verification_description_pending')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <DeliveryVerification order={order} />
            </CardContent>
        </Card>
      )}
    </div>
  );
}
