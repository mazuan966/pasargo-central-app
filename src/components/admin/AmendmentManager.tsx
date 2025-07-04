'use client';

import type { Order } from '@/lib/types';
import { useOrders } from '@/hooks/use-orders';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export function AmendmentManager({ order }: { order: Order }) {
  const { updateOrder } = useOrders();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const isAmendable = order.status !== 'Completed' && order.status !== 'Delivered' && order.status !== 'Cancelled';

  const handleToggleAmendment = async (isAllowed: boolean) => {
    if (!isAmendable) return;

    setIsLoading(true);
    const updatedOrder: Order = { ...order, isEditable: isAllowed };
    
    try {
      await updateOrder(updatedOrder);
      toast({
        title: 'Amendment Status Updated',
        description: `Customer amendment has been ${isAllowed ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      console.error("Failed to update amendment status:", error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'There was a problem updating the amendment status.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Amendment</CardTitle>
        <CardDescription>Allow the customer to modify this order.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
            <Switch
                id="amendment-switch"
                checked={!!order.isEditable}
                onCheckedChange={handleToggleAmendment}
                disabled={isLoading || !isAmendable}
                aria-readonly
            />
            <Label htmlFor="amendment-switch">
                {isLoading 
                    ? <div className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</div>
                    : (order.isEditable ? 'Amendment Enabled' : 'Amendment Disabled')
                }
            </Label>
        </div>
        {!isAmendable && (
            <p className="text-sm text-muted-foreground mt-2">
                This order cannot be amended as it has already been {order.status}.
            </p>
        )}
      </CardContent>
    </Card>
  );
}
