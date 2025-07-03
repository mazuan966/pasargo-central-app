'use client';

import React, { createContext, useState, ReactNode } from 'react';
import type { Order, CartItem, User } from '@/lib/types';
import { mockOrders } from '@/lib/mock-data';

interface OrderContextType {
  orders: Order[];
  addOrder: (items: CartItem[], total: number, paymentMethod: 'billplz' | 'cod') => void;
  updateOrder: (updatedOrder: Order) => void;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(mockOrders);

  const sendWhatsAppMessage = (phoneNumber: string, message: string) => {
    if (!phoneNumber) {
      console.error('WhatsApp Error: Phone number is missing.');
      return;
    }
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank')?.focus();
  };

  const addOrder = (items: CartItem[], total: number, paymentMethod: 'billplz' | 'cod') => {
    // In a real app, this user would be the currently logged-in user.
    const currentUser: User = {
      id: 'user-01',
      restaurantName: 'The Daily Grind Cafe',
      phoneNumber: '60123456789',
      latitude: 3.1390,
      longitude: 101.6869,
      tin: 'C21876543210',
      address: '123 Jalan Ampang, 50450 Kuala Lumpur'
    };

    const newOrder: Order = {
      id: `ORD-${Date.now().toString().slice(-4)}`,
      user: currentUser,
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

    // --- WhatsApp Integration ---

    // 1. Send Invoice to User
    const userInvoiceMessage = `Hi ${currentUser.restaurantName}!\n\nThank you for your order!\n\n*Invoice for Order #${newOrder.id}*\n\n` +
      newOrder.items.map(item => `- ${item.name} (${item.quantity} x RM ${item.price.toFixed(2)})`).join('\n') +
      `\n\n*Total: RM ${newOrder.total.toFixed(2)}*\n\n` +
      `We will process your order shortly.`;
    
    if (currentUser.phoneNumber) {
        sendWhatsAppMessage(currentUser.phoneNumber, userInvoiceMessage);
    }

    // 2. Send PO to Admin
    const adminPhoneNumber = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER;
    if (adminPhoneNumber) {
        const adminPOMessage = `*New Purchase Order Received*\n\n` +
            `*Order ID:* ${newOrder.id}\n` +
            `*From:* ${currentUser.restaurantName}\n` +
            `*Total:* RM ${newOrder.total.toFixed(2)}\n\n` +
            `*Items:*\n` +
            newOrder.items.map(item => `- ${item.name} (x${item.quantity})`).join('\n') +
            `\n\nPlease process the order in the admin dashboard.`;
        
        sendWhatsAppMessage(adminPhoneNumber, adminPOMessage);
    } else {
        console.warn('Admin WhatsApp number (NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER) not configured. Skipping admin notification.');
    }
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
