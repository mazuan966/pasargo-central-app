
'use client';

import React, { createContext, useState, ReactNode, useMemo } from 'react';
import type { Order, OrderStatus } from '@/lib/types';

// This is a placeholder OrderProvider now that Firebase has been removed.
// It will return an empty list of orders.

interface OrderContextType {
  orders: Order[];
  updateOrder: (updatedOrder: Order) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  bulkUpdateOrderStatus: (orderIds: string[], status: OrderStatus) => Promise<void>;
  bulkDeleteOrders: (orderIds: string[]) => Promise<void>;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);

  const updateOrder = async (updatedOrder: Order) => {
    console.log("Firebase removed. Cannot update order:", updatedOrder.id);
  };
  
  const deleteOrder = async (orderId: string) => {
    console.log("Firebase removed. Cannot delete order:", orderId);
  };

  const bulkUpdateOrderStatus = async (orderIds: string[], newStatus: OrderStatus) => {
     console.log(`Firebase removed. Cannot bulk update ${orderIds.length} orders to ${newStatus}.`);
  };

  const bulkDeleteOrders = async (orderIds: string[]) => {
    console.log(`Firebase removed. Cannot bulk delete ${orderIds.length} orders.`);
  };

  const value = useMemo(() => ({
    orders,
    updateOrder,
    deleteOrder,
    bulkUpdateOrderStatus,
    bulkDeleteOrders
  }), [orders]);


  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
}
