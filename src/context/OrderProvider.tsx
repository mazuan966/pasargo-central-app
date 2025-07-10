
'use client';

import React, { createContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import type { Order, OrderStatus } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, FirestoreError, where, writeBatch, getDocs, documentId } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';

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
  const { currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait until authentication is no longer loading and db is available
    if (authLoading || !db) {
        if (!db) {
            console.warn("Firestore not initialized. Skipping order listener.");
        }
        setOrders([]);
        return;
    }

    const isUser = !!currentUser;
    const ordersCollection = collection(db, 'orders');
    // The query now correctly determines whether to filter by user or fetch all for admin roles.
    const q = isUser && currentUser?.uid
        ? query(ordersCollection, where("user.id", "==", currentUser.uid))
        : query(ordersCollection, orderBy('orderDate', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      // Client-side sort for user-specific queries to avoid composite indexes
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

    // Cleanup the listener when the component unmounts or dependencies change
    return () => unsubscribe();
  }, [currentUser, authLoading]); // Re-run when authentication state changes

  const updateOrder = useCallback(async (updatedOrder: Order) => {
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
  }, []);
  
  const deleteOrder = useCallback(async (orderId: string) => {
    if (!db) {
      throw new Error("Firestore is not configured. Cannot delete order.");
    }
    if (!orderId) {
        console.error("Cannot delete order without an ID");
        return;
    }
    const orderDocRef = doc(db, 'orders', orderId);
    await deleteDoc(orderDocRef);
  }, []);

  const bulkUpdateOrderStatus = useCallback(async (orderIds: string[], newStatus: OrderStatus) => {
    if (!db || orderIds.length === 0) {
      throw new Error("Firestore is not configured or no orders selected. Cannot perform bulk update.");
    }
    
    const batch = writeBatch(db);
    const ordersQuery = query(collection(db, 'orders'), where(documentId(), 'in', orderIds));
    const ordersSnapshot = await getDocs(ordersQuery);

    ordersSnapshot.forEach((orderDoc) => {
      const orderData = orderDoc.data() as Order;
      const orderRef = doc(db, 'orders', orderDoc.id);
      const newHistoryEntry = { status: newStatus, timestamp: new Date().toISOString() };
      
      const lastStatus = orderData.statusHistory[orderData.statusHistory.length - 1];
      const newHistory = lastStatus.status !== newStatus ? [...orderData.statusHistory, newHistoryEntry] : orderData.statusHistory;
      
      batch.update(orderRef, { status: newStatus, statusHistory: newHistory });
    });

    await batch.commit();
  }, []);

  const bulkDeleteOrders = useCallback(async (orderIds: string[]) => {
    if (!db) {
        throw new Error("Firestore is not configured. Cannot perform bulk delete.");
    }
    const batch = writeBatch(db);
    orderIds.forEach(orderId => {
        const orderRef = doc(db, 'orders', orderId);
        batch.delete(orderRef);
    });
    await batch.commit();
  }, []);

  const value = useMemo(() => ({
    orders,
    updateOrder,
    deleteOrder,
    bulkUpdateOrderStatus,
    bulkDeleteOrders
  }), [orders, updateOrder, deleteOrder, bulkUpdateOrderStatus, bulkDeleteOrders]);


  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
}
