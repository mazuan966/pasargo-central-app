'use client';

import React, { createContext, useState, ReactNode, useEffect } from 'react';
import type { Order, CartItem, User } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, FirestoreError, getCountFromServer, where } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';

interface OrderContextType {
  orders: Order[];
  addOrder: (items: CartItem[], subtotal: number, sst: number, total: number, paymentMethod: 'billplz' | 'cod') => Promise<void>;
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
  const { currentUser, userData } = useAuth();

  useEffect(() => {
    if (!db) {
        console.warn("Firestore not initialized. Skipping order listener.");
        setOrders([]);
        return;
    }

    const isUser = !!currentUser;

    const ordersCollection = collection(db, 'orders');
    // For users, we remove the orderBy clause to avoid needing a composite index.
    // We will sort on the client side instead.
    const q = isUser 
        ? query(ordersCollection, where("user.id", "==", currentUser.uid))
        : query(ordersCollection, orderBy('orderDate', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      // Sort on the client if we didn't do it in the query.
      if (isUser) {
        ordersList.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      }
      
      setOrders(ordersList);
    },
    (error: FirestoreError) => {
      if (error.code === 'permission-denied') {
          console.error("Firestore permission denied. Check security rules for the 'orders' collection.");
      } else {
        console.error("Order snapshot error:", error);
      }
      setOrders([]);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const addOrder = async (items: CartItem[], subtotal: number, sst: number, total: number, paymentMethod: 'billplz' | 'cod') => {
    if (!db || !userData) {
      throw new Error("Firestore is not configured or user is not logged in. Cannot add order.");
    }
    
    const snapshot = await getCountFromServer(collection(db, 'orders'));
    const newOrderIndex = snapshot.data().count + 1;
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const datePart = `${day}${month}${year}`;
    const numberPart = String(newOrderIndex).padStart(4, '0');
    const newOrderNumber = `PA${numberPart}${datePart}`;

    const newOrderData: Omit<Order, 'id'> = {
      orderNumber: newOrderNumber,
      user: userData,
      items: items.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        hasSst: !!item.hasSst,
      })),
      subtotal,
      sst,
      total,
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
    
    const userInvoiceMessage = `Hi ${userData.restaurantName}!\n\nThank you for your order!\n\n*Invoice for Order #${newOrder.orderNumber}*\n\n` +
      newOrder.items.map(item => `- ${item.name} (${item.quantity} x RM ${item.price.toFixed(2)})`).join('\n') +
      `\n\nSubtotal: RM ${newOrder.subtotal.toFixed(2)}\nSST (6%): RM ${newOrder.sst.toFixed(2)}\n*Total: RM ${newOrder.total.toFixed(2)}*\n\n` +
      `We will process your order shortly.`;
    
    if (userData.phoneNumber) {
        simulateDirectWhatsApp(userData.phoneNumber, userInvoiceMessage);
    }

    const adminPhoneNumber = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER;
    if (adminPhoneNumber) {
        const adminPOMessage = `*New Purchase Order Received*\n\n` +
            `*Order ID:* ${newOrder.orderNumber}\n` +
            `*From:* ${userData.restaurantName}\n` +
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
