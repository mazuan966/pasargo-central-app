
'use client';

import React, { createContext, useState, ReactNode, useEffect } from 'react';
import type { Order, CartItem, User } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, FirestoreError, getCountFromServer, where, runTransaction } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';

const SST_RATE = 0.06;

interface OrderContextType {
  orders: Order[];
  addOrder: (items: CartItem[], subtotal: number, sst: number, total: number, paymentMethod: 'billplz' | 'cod', deliveryDate: string, deliveryTimeSlot: string, originalOrderId?: string) => Promise<void>;
  updateOrder: (updatedOrder: Order) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  amendCodOrder: (originalOrder: Order, amendedItems: CartItem[]) => Promise<void>;
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
    const q = isUser && currentUser?.uid
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

  const addOrder = async (items: CartItem[], subtotal: number, sst: number, total: number, paymentMethod: 'billplz' | 'cod', deliveryDate: string, deliveryTimeSlot: string, originalOrderId?: string) => {
    if (!db || !userData) {
      throw new Error("Firestore is not configured or user is not logged in. Cannot add order.");
    }
    
    try {
        if (originalOrderId) {
            // This is an AMENDMENT to an existing order (for FPX/pre-paid)
            await runTransaction(db, async (transaction) => {
                const originalOrderRef = doc(db, 'orders', originalOrderId);
                const originalOrderDoc = await transaction.get(originalOrderRef);

                if (!originalOrderDoc.exists()) {
                    throw new Error("Original order not found.");
                }

                const productUpdates: { ref: any, newStock: number }[] = [];
                for (const item of items) {
                    const productRef = doc(db, 'products', item.id);
                    const productDoc = await transaction.get(productRef);
                    if (!productDoc.exists()) throw new Error(`Product "${item.name}" does not exist.`);
                    const currentStock = productDoc.data().stock;
                    if (currentStock < item.quantity) throw new Error(`Not enough stock for "${item.name}".`);
                    productUpdates.push({ ref: productRef, newStock: currentStock - item.quantity });
                }

                for (const update of productUpdates) {
                    transaction.update(update.ref, { stock: update.newStock });
                }
                
                const originalOrderData = originalOrderDoc.data() as Order;
                
                // Merge new items into the existing list, preventing duplicates
                const updatedItemsMap = new Map(originalOrderData.items.map(i => [i.productId, { ...i }]));

                for (const newItem of items) {
                    if (updatedItemsMap.has(newItem.id)) {
                        const existingItem = updatedItemsMap.get(newItem.id)!;
                        existingItem.quantity += newItem.quantity;
                        existingItem.amendmentStatus = 'updated';
                    } else {
                        updatedItemsMap.set(newItem.id, {
                            productId: newItem.id,
                            name: newItem.name,
                            quantity: newItem.quantity,
                            price: newItem.price,
                            hasSst: !!newItem.hasSst,
                            amendmentStatus: 'added' as const,
                        });
                    }
                }
                
                const finalItems = Array.from(updatedItemsMap.values());
                
                transaction.update(originalOrderRef, {
                    items: finalItems,
                    subtotal: originalOrderData.subtotal + subtotal,
                    sst: originalOrderData.sst + sst,
                    total: originalOrderData.total + total,
                    isEditable: false,
                });
            });

        } else {
            // This is a NEW order
            await runTransaction(db, async (transaction) => {
                const productUpdates: { ref: any, newStock: number }[] = [];
                for (const item of items) {
                    const productRef = doc(db, 'products', item.id);
                    const productDoc = await transaction.get(productRef);
                    if (!productDoc.exists()) throw new Error(`Product "${item.name}" does not exist.`);
                    const currentStock = productDoc.data().stock;
                    if (currentStock < item.quantity) throw new Error(`Not enough stock for "${item.name}".`);
                    productUpdates.push({ ref: productRef, newStock: currentStock - item.quantity });
                }

                for (const update of productUpdates) {
                    transaction.update(update.ref, { stock: update.newStock });
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
                        amendmentStatus: 'original',
                    })),
                    subtotal,
                    sst,
                    total,
                    status: 'Order Created',
                    orderDate: new Date().toISOString(),
                    deliveryDate,
                    deliveryTimeSlot,
                    paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : 'Bank Transfer',
                    paymentStatus: paymentMethod === 'cod' ? 'Pending Payment' : 'Pending Confirmation',
                    statusHistory: [
                        { status: 'Order Created', timestamp: new Date().toISOString() },
                    ],
                };
                
                const newOrderRef = doc(collection(db, "orders"));
                transaction.set(newOrderRef, newOrderData);

                const userInvoiceMessage = `Hi ${userData.restaurantName}!\n\nThank you for your order!\n\n*Invoice for Order #${newOrderNumber}*\n\n` +
                `*Delivery Date:* ${new Date(deliveryDate).toLocaleDateString()}\n` +
                `*Delivery Time:* ${deliveryTimeSlot}\n\n` +
                items.map(item => `- ${item.name} (${item.quantity} x RM ${item.price.toFixed(2)})`).join('\n') +
                `\n\nSubtotal: RM ${subtotal.toFixed(2)}\nSST (6%): RM ${sst.toFixed(2)}\n*Total: RM ${total.toFixed(2)}*\n\n` +
                `We will process your order shortly.`;
                
                if (userData.phoneNumber) {
                    simulateDirectWhatsApp(userData.phoneNumber, userInvoiceMessage);
                }

                const adminPhoneNumber = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER;
                if (adminPhoneNumber) {
                    const adminPOMessage = `*New Purchase Order Received*\n\n` +
                        `*Order ID:* ${newOrderNumber}\n` +
                        `*From:* ${userData.restaurantName}\n` +
                        `*Total:* RM ${total.toFixed(2)}*\n\n` +
                        `*Delivery:* ${new Date(deliveryDate).toLocaleDateString()} (${deliveryTimeSlot})\n\n` +
                        `*Items:*\n` +
                        items.map(item => `- ${item.name} (x${item.quantity})`).join('\n') +
                        `\n\nPlease process the order in the admin dashboard.`;
                    
                    simulateDirectWhatsApp(adminPOMessage, adminPOMessage);
                } else {
                    console.warn('Admin WhatsApp number (NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER) not configured. Skipping admin notification.');
                }
            });
        }
    } catch (e: any) {
        console.error("Order transaction failed: ", e);
        throw new Error(e.message || "Failed to process order due to a stock issue or other error.");
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

  const amendCodOrder = async (originalOrder: Order, amendedItems: CartItem[]) => {
    if (!db) {
      throw new Error("Database not configured.");
    }

    try {
        await runTransaction(db, async (transaction) => {
            const orderRef = doc(db, 'orders', originalOrder.id);
            const stockAdjustments: Map<string, number> = new Map();

            const allItemIds = new Set([...originalOrder.items.map(i => i.productId), ...amendedItems.map(i => i.id)]);

            for (const itemId of allItemIds) {
                const originalQty = originalOrder.items.find(i => i.productId === itemId)?.quantity || 0;
                const amendedQty = amendedItems.find(i => i.id === itemId)?.quantity || 0;
                const diff = originalQty - amendedQty;
                if (diff !== 0) {
                    stockAdjustments.set(itemId, diff);
                }
            }

            const productRefs = Array.from(stockAdjustments.keys()).map(id => doc(db, 'products', id));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));
            
            for (let i = 0; i < productDocs.length; i++) {
                const productDoc = productDocs[i];
                const productId = productRefs[i].id;
                const adjustment = stockAdjustments.get(productId)!;
                
                if (!productDoc.exists()) throw new Error(`Product with ID ${productId} not found.`);
                
                const currentStock = productDoc.data().stock;
                if (adjustment < 0 && currentStock < Math.abs(adjustment)) {
                    throw new Error(`Not enough stock for ${productDoc.data().name}. Only ${currentStock} available.`);
                }
            }

            for (let i = 0; i < productDocs.length; i++) {
                const productDoc = productDocs[i];
                const productId = productRefs[i].id;
                const adjustment = stockAdjustments.get(productId)!;
                const newStock = productDoc.data().stock + adjustment;
                transaction.update(productRefs[i], { stock: newStock });
            }

            const newSubtotal = amendedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const newSst = amendedItems.reduce((sum, item) => item.hasSst ? sum + (item.price * item.quantity * SST_RATE) : sum, 0);
            const newTotal = newSubtotal + newSst;
            
            const finalItemsWithStatus: Order['items'] = amendedItems.map(amendedItem => {
                const originalItem = originalOrder.items.find(i => i.productId === amendedItem.id);
                let amendmentStatus: Order['items'][0]['amendmentStatus'] = 'original';

                if (!originalItem) {
                    amendmentStatus = 'added';
                } else if (amendedItem.quantity > originalItem.quantity) {
                    amendmentStatus = 'updated';
                }

                return {
                    productId: amendedItem.id,
                    name: amendedItem.name,
                    quantity: amendedItem.quantity,
                    price: amendedItem.price,
                    hasSst: !!amendedItem.hasSst,
                    amendmentStatus: amendmentStatus,
                };
            });

            transaction.update(orderRef, {
                items: finalItemsWithStatus,
                subtotal: newSubtotal,
                sst: newSst,
                total: newTotal,
                isEditable: false,
            });
        });

    } catch (error: any) {
        console.error("Amend order transaction failed:", error);
        throw new Error(error.message || "An unknown error occurred during the update.");
    }
  }


  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrder, deleteOrder, amendCodOrder }}>
      {children}
    </OrderContext.Provider>
  );
}
