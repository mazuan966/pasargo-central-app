
'use client';

import React, { createContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import type { Order, OrderStatus, CartItem, PaymentMethod, User } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, FirestoreError, getCountFromServer, writeBatch, runTransaction } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { getTranslation, getTranslatedItemField } from '@/lib/translations';
import { format } from 'date-fns';


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
  const { currentUser, userData, loading: authLoading } = useAuth();

  const isUserAdmin = useMemo(() => {
    // Basic admin check based on a known UID or a custom claim in a real app.
    // This logic should be hardened in a real application.
    return !currentUser || currentUser.email === 'pasargo.admin@gmail.com'; // Example admin email
  }, [currentUser]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!db) {
      console.warn("OrderProvider: Firestore is not available, skipping order fetch.");
      return;
    }

    let q;
    const ordersCollection = collection(db, 'orders');

    if (isUserAdmin) {
      // Admin sees all orders
      q = query(ordersCollection, orderBy('orderDate', 'desc'));
    } else if (currentUser) {
      // Regular user sees only their orders.
      // We remove the `orderBy` clause to prevent the missing index error.
      // Sorting will be handled on the client after fetching.
      q = query(ordersCollection, where("user.id", "==", currentUser.uid));
    } else {
      // No user, no orders
      setOrders([]);
      return;
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      
      // Sort on the client-side to ensure chronological order for all users
      ordersData.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

      setOrders(ordersData);
    }, (error: FirestoreError) => {
      console.error(`Error fetching orders: ${error.message}`);
      if (error.code === 'permission-denied') {
        console.error("Firestore permission denied. Check security rules for the 'orders' collection.");
      }
      setOrders([]);
    });

    return () => unsubscribe();
  }, [currentUser, isUserAdmin, authLoading]);
  
  const updateOrder = useCallback(async (updatedOrder: Order) => {
    if (!db) throw new Error("Firestore not initialized.");
    const { id, ...orderData } = updatedOrder;
    const orderRef = doc(db, 'orders', id);
    await updateDoc(orderRef, orderData);
  }, []);

  const deleteOrder = useCallback(async (orderId: string) => {
    if (!db) throw new Error("Firestore not initialized.");
    const orderRef = doc(db, 'orders', orderId);
    await deleteDoc(orderRef);
  }, []);
  
  const bulkUpdateOrderStatus = useCallback(async (orderIds: string[], status: OrderStatus) => {
    if (!db) throw new Error("Firestore not initialized.");
    const batch = writeBatch(db);
    const ordersToUpdate = orders.filter(order => orderIds.includes(order.id));

    for (const order of ordersToUpdate) {
        const orderRef = doc(db, 'orders', order.id);
        const newHistoryEntry = { status, timestamp: new Date().toISOString() };
        
        // Prevent adding duplicate status entries
        const lastStatus = order.statusHistory[order.statusHistory.length - 1];
        const newHistory = lastStatus.status !== status ? [...order.statusHistory, newHistoryEntry] : order.statusHistory;

        batch.update(orderRef, { status, statusHistory: newHistory });
    }
    await batch.commit();
  }, [orders]);

  const bulkDeleteOrders = useCallback(async (orderIds: string[]) => {
    if (!db) throw new Error("Firestore not initialized.");
    const batch = writeBatch(db);
    orderIds.forEach(id => {
        const orderRef = doc(db, 'orders', id);
        batch.delete(orderRef);
    });
    await batch.commit();
  }, []);

  const value = useMemo(() => ({
    orders,
    updateOrder,
    deleteOrder,
    bulkUpdateOrderStatus,
    bulkDeleteOrders,
  }), [orders, updateOrder, deleteOrder, bulkUpdateOrderStatus, bulkDeleteOrders]);

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
}
