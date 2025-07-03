'use client';

import React, { createContext, useState, ReactNode } from 'react';
import type { Order, CartItem } from '@/lib/types';
import { mockOrders } from '@/lib/mock-data';

interface OrderContextType {
  orders: Order[];
  addOrder: (items: CartItem[], total: number, paymentMethod: 'billplz' | 'cod') => void;
  updateOrder: (updatedOrder: Order) => void;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(mockOrders);

  const addOrder = (items: CartItem[], total: number, paymentMethod: 'billplz' | 'cod') => {
    const newOrder: Order = {
      id: `ORD-${Date.now().toString().slice(-4)}`,
      user: {
        id: 'user-01',
        restaurantName: 'The Daily Grind Cafe', // Assuming a static user for now
        phoneNumber: '60123456789',
        latitude: 3.1390,
        longitude: 101.6869,
        tin: 'C21876543210',
        address: '123 Jalan Ampang, 50450 Kuala Lumpur'
      },
      items: items.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      total: total,
      status: 'Order Created',
      orderDate: new Date().toISOString(),
      paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : 'Bank Transfer',
      paymentStatus: paymentMethod === 'cod' ? 'Pending Payment' : 'Pending Confirmation',
      statusHistory: [
        { status: 'Order Created', timestamp: new Date().toISOString() },
      ],
    };

    setOrders(prevOrders => [newOrder, ...prevOrders]);
  };

  const updateOrder = (updatedOrder: Order) => {
    setOrders(prevOrders =>
      prevOrders.map(order => (order.id === updatedOrder.id ? updatedOrder : order))
    );
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrder }}>
      {children}
    </OrderContext.Provider>
  );
}
