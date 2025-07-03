'use client';

import { OrderDetails } from '@/components/orders/OrderDetails';
import { DeliveryVerification } from '@/components/orders/DeliveryVerification';
import { useOrders } from '@/hooks/use-orders';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Loader2, Printer, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActionState, useEffect, useState } from 'react';
import { generateEInvoiceAction } from '@/lib/actions';
import type { Order, EInvoice } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const EInvoiceInitialState = {
  success: false,
  message: '',
};

function EInvoiceGenerator({ order, onInvoiceGenerated }: { order: Order, onInvoiceGenerated: (invoice: EInvoice) => void }) {
  const [state, formAction, isPending] = useActionState(generateEInvoiceAction, EInvoiceInitialState);

  useEffect(() => {
    if (state.success && state.data) {
        onInvoiceGenerated(state.data);
    }
  }, [state, onInvoiceGenerated]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate E-Invoice</CardTitle>
        <CardDescription>Submit this order to LHDN for e-invoice validation.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="orderDate" value={order.orderDate} />
            <input type="hidden" name="total" value={order.total} />
            <input type="hidden" name="items" value={JSON.stringify(order.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })))} />
            <input type="hidden" name="seller" value={JSON.stringify({ name: 'Pasargo Central', tin: 'TIN-PASARGO-123' })} />
            <input type="hidden" name="buyer" value={JSON.stringify({ name: order.user.restaurantName, tin: order.user.tin, address: order.user.address })} />
            
            <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Generate & Validate
            </Button>
        </form>
         {state && !state.success && state.message && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
      </CardContent>
    </Card>
  );
}

function EInvoiceDisplay({ eInvoice }: { eInvoice: EInvoice }) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <Card>
            <CardHeader>
            <CardTitle>E-Invoice Details</CardTitle>
            <CardDescription>This invoice has been validated by LHDN.</CardDescription>
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

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const { orders, updateOrder } = useOrders();
  const [order, setOrder] = useState<Order | undefined>();
  const [isMounted, setIsMounted] = useState(false);
  const [whatsAppUrl, setWhatsAppUrl] = useState('#');

  useEffect(() => {
    setIsMounted(true);
    const foundOrder = orders.find(o => o.id === params.id);
    setOrder(foundOrder);
  }, [params.id, orders]);

  useEffect(() => {
    if (isMounted && order?.user.phoneNumber) {
        const invoiceUrl = `${window.location.origin}/print/invoice/${order.id}`;
        const message = `Hello! Here is a copy of your invoice for order #${order.id}.\nTotal: RM ${order.total.toFixed(2)}\n\nYou can view and print the full invoice here:\n${invoiceUrl}`;
        const phoneNumber = order.user.phoneNumber.replace(/[^0-9]/g, ''); // Clean the phone number
        setWhatsAppUrl(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`);
    }
  }, [isMounted, order]);

  if (!isMounted) {
    return (
      <div className="flex w-full justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    notFound();
    return null; // For TypeScript
  }
  
  const handleInvoiceGenerated = (eInvoice: EInvoice) => {
    const updatedOrder = { ...order, eInvoice };
    updateOrder(updatedOrder);
  };

  const canGenerateEInvoice = (order.status === 'Completed' || order.status === 'Delivered');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm" className="mb-4">
          <Link href="/orders" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
          </Link>
        </Button>
        <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/print/invoice/${order.id}`} target="_blank">
                <Printer className="mr-2 h-4 w-4" />
                Print Invoice
              </Link>
            </Button>
            <Button asChild variant="outline" disabled={!order.user.phoneNumber}>
              <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                <Send className="mr-2 h-4 w-4" />
                Send via WhatsApp
              </a>
            </Button>
        </div>
      </div>
      
      <OrderDetails order={order} />

      {canGenerateEInvoice && !order.eInvoice && <EInvoiceGenerator order={order} onInvoiceGenerated={handleInvoiceGenerated} />}
      {order.eInvoice && <EInvoiceDisplay eInvoice={order.eInvoice} />}

      {(order.status === 'Delivered' || order.status === 'Completed') && (
        <Card>
            <CardHeader>
                <CardTitle>Delivery Verification</CardTitle>
                <CardDescription>
                    {order.deliveryVerification 
                        ? 'Verification has been completed for this order.'
                        : 'Please upload a photo of the signed receipt to complete the order.'}
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
