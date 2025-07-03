
'use client';

import React, { createContext, useState, ReactNode, useEffect } from 'react';
import type { Order, CartItem, User } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, FirestoreError } from 'firebase/firestore';

interface OrderContextType {
  orders: Order[];
  addOrder: (items: CartItem[], total: number, paymentMethod: 'billplz' | 'cod') => Promise<void>;
  updateOrder: (updatedOrder: Order) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

const simulateDirectWhatsApp = (phoneNumber: string, message: string) => {
  if (!phoneNumber) {
    console.error('WhatsApp Simulation Error: Phone number is missing.');
    return;
  }
  console.log('--- SIMULATING WHATSAPP MESSAGE ---');
  console.log(`To: ${phoneNumber}`);
  console.log(`Message: ${message}`);
  console.log('------------------------------------');
};

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // If db is not initialized, do not attempt to fetch data.
    if (!db) {
        console.warn("Firestore not initialized. Skipping order listener.");
        setOrders([]);
        return;
    }
    const q = query(collection(db, 'orders'), orderBy('orderDate', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersList);
    },
    (error: FirestoreError) => {
      // Added error handling for the snapshot listener
      console.error("Order snapshot error:", error);
      if (error.code === 'permission-denied') {
          console.error("Firestore permission denied. Please check your security rules for the 'orders' collection.");
      }
      // Set orders to an empty array on error to prevent displaying stale data.
      setOrders([]);
    });

    return () => unsubscribe();
  }, []);

  const addOrder = async (items: CartItem[], total: number, paymentMethod: 'billplz' | 'cod') => {
    if (!db) {
      throw new Error("Firestore is not configured. Cannot add order.");
    }
    const currentUser: User = {
      id: 'user-01',
      restaurantName: 'The Daily Grind Cafe',
      phoneNumber: '60123456789',
      latitude: 3.1390,
      longitude: 101.6869,
      tin: 'C21876543210',
      address: '123 Jalan Ampang, 50450 Kuala Lumpur'
    };

    const newOrderData: Omit<Order, 'id'> = {
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

    const docRef = await addDoc(collection(db, 'orders'), newOrderData);
    const newOrder = { ...newOrderData, id: docRef.id } as Order;
    
    // --- WhatsApp Integration Simulation ---
    const userInvoiceMessage = `Hi ${currentUser.restaurantName}!\n\nThank you for your order!\n\n*Invoice for Order #${newOrder.id}*\n\n` +
      newOrder.items.map(item => `- ${item.name} (${item.quantity} x RM ${item.price.toFixed(2)})`).join('\n') +
      `\n\n*Total: RM ${newOrder.total.toFixed(2)}*\n\n` +
      `We will process your order shortly.`;
    
    if (currentUser.phoneNumber) {
        simulateDirectWhatsApp(currentUser.phoneNumber, userInvoiceMessage);
    }

    const adminPhoneNumber = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER;
    if (adminPhoneNumber) {
        const adminPOMessage = `*New Purchase Order Received*\n\n` +
            `*Order ID:* ${newOrder.id}\n` +
            `*From:* ${currentUser.restaurantName}\n` +
            `*Total:* RM ${newOrder.total.toFixed(2)}*\n\n` +
            `*Items:*\n` +
            newOrder.items.map(item => `- ${item.name} (x${item.quantity})`).join('\n') +
            `\n\nPlease process the order in the admin dashboard.`;
        
        simulateDirectWhatsApp(adminPhoneNumber, adminPOMessage);
    } else {
        console.warn('Admin WhatsApp number (NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER) not configured. Skipping admin notification.');
    }
  };

  const updateOrder = async (updatedOrder: Order) => {
    if (!db) {
      throw new Error("Firestore is not configured. Cannot update order.");
    }
    const { id, ...orderData } = updatedOrder;
     if (!id) {
        console.error("Cannot update order without an ID");
        return;
    }
    const orderDocRef = doc(db, 'orders', id);
    await updateDoc(orderDocRef, orderData);
  };
  
  const deleteOrder = async (orderId: string) => {
    if (!db) {
      throw new Error("Firestore is not configured. Cannot delete order.");
    }
    if (!orderId) {
        console.error("Cannot delete order without an ID");
        return;
    }
    const orderDocRef = doc(db, 'orders', orderId);
    await deleteDoc(orderDocRef);
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrder, deleteOrder }}>
      {children}
    </OrderContext.Provider>
  );
}
