
'use client';

import type { Order, PaymentStatus } from '@/lib/types';
import { useOrders } from '@/hooks/use-orders';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const paymentStatuses: PaymentStatus[] = ['Pending Payment', 'Paid', 'Failed'];

export function PaymentManager({ order }: { order: Order }) {
  const { updateOrder } = useOrders();
  const { toast } = useToast();
  const [newStatus, setNewStatus] = useState<PaymentStatus>(order.paymentStatus);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdatePaymentStatus = async () => {
    setIsLoading(true);
    const updatedOrder: Order = { ...order, paymentStatus: newStatus };
    
    try {
      await updateOrder(updatedOrder);
      toast({
        title: 'Payment Status Updated',
        description: `Order ${order.orderNumber} payment status set to ${newStatus}.`,
      });
    } catch (error) {
      console.error("Failed to update payment status:", error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'There was a problem updating the payment status.',
      });
      // Revert state on failure
      setNewStatus(order.paymentStatus);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>Manage the payment status for this order.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p><strong>Method:</strong> {order.paymentMethod}</p>
        <div className="space-y-2">
          <Label htmlFor="payment-status">Current Status</Label>
          <div className="flex items-center gap-2">
            <Select
              value={newStatus}
              onValueChange={(value: PaymentStatus) => setNewStatus(value)}
              disabled={isLoading}
            >
              <SelectTrigger id="payment-status">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {paymentStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleUpdatePaymentStatus}
              disabled={isLoading || newStatus === order.paymentStatus}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
