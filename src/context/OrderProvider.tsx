
'use client';

import React, { createContext, useState, ReactNode, useEffect } from 'react';
import type { Order, CartItem, User, OrderStatus, PaymentMethod } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, FirestoreError, getCountFromServer, where, runTransaction, writeBatch } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import crypto from 'crypto-js';

const SST_RATE = 0.06;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

interface OrderContextType {
  orders: Order[];
  addOrder: (items: CartItem[], subtotal: number, sst: number, total: number, paymentMethod: 'toyyibpay' | 'cod', deliveryDate: string, deliveryTimeSlot: string, originalOrderId?: string) => Promise<{ redirectUrl?: string }>;
  updateOrder: (updatedOrder: Order) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  amendCodOrder: (originalOrder: Order, amendedItems: CartItem[]) => Promise<void>;
  bulkUpdateOrderStatus: (orderIds: string[], status: OrderStatus) => Promise<void>;
  bulkDeleteOrders: (orderIds: string[]) => Promise<void>;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

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
    const q = isUser && currentUser?.uid
        ? query(ordersCollection, where("user.id", "==", currentUser.uid))
        : query(ordersCollection, orderBy('orderDate', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
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

  const sendAmendmentNotifications = async (updatedOrder: Order, user: User) => {
    const testPhoneNumber = '60163864181';

    const itemsSummary = updatedOrder.items.map(item => {
        let statusTag = '';
        if (item.amendmentStatus === 'added') statusTag = ' [Added]';
        else if (item.amendmentStatus === 'updated') statusTag = ' [Updated]';
        return `- ${item.name} (${item.quantity} x RM ${item.price.toFixed(2)})${statusTag}`;
    }).join('\n');

    const adminItemsSummary = updatedOrder.items.map(item => {
        let statusTag = '';
        if (item.amendmentStatus === 'added') statusTag = ' [Added]';
        else if (item.amendmentStatus === 'updated') statusTag = ' [Updated]';
        return `- ${item.name} (x${item.quantity})${statusTag}`;
    }).join('\n');

    const userMessage = `Hi ${user.restaurantName}!\n\nYour Order #${updatedOrder.orderNumber} has been successfully *UPDATED*.\n\n` +
    `*Delivery remains scheduled for:* ${new Date(updatedOrder.deliveryDate).toLocaleDateString()} at ${updatedOrder.deliveryTimeSlot}\n\n` +
    `*Updated Items:*\n` +
    itemsSummary +
    `\n\nSubtotal: RM ${updatedOrder.subtotal.toFixed(2)}\nSST (6%): RM ${updatedOrder.sst.toFixed(2)}\n*New Total: RM ${updatedOrder.total.toFixed(2)}*` +
    `\n\nHere is the unique link to view your updated invoice:\n${appUrl}/print/invoice/${updatedOrder.id}` +
    `\n\nWe will process your updated order shortly.`;
    
    await sendWhatsAppMessage(testPhoneNumber, userMessage);

    const adminMessage = `*Order Amended*\n\n` +
    `Order *#${updatedOrder.orderNumber}* for *${user.restaurantName}* has been updated.\n\n` +
    `*New Total: RM ${updatedOrder.total.toFixed(2)}*\n\n` +
    `*Updated Items:*\n` +
    adminItemsSummary +
    `\n\nView the updated Purchase Order here:\n${appUrl}/admin/print/po/${updatedOrder.id}`;

    await sendWhatsAppMessage(testPhoneNumber, `[ADMIN PO UPDATE] ${adminMessage}`);
  };

  const addOrder = async (items: CartItem[], subtotal: number, sst: number, total: number, paymentMethod: 'toyyibpay' | 'cod', deliveryDate: string, deliveryTimeSlot: string, originalOrderId?: string): Promise<{ redirectUrl?: string }> => {
    if (!db || !userData) {
      throw new Error("Firestore is not configured or user is not logged in. Cannot add order.");
    }
    
    try {
        if (originalOrderId) {
            // This is an AMENDMENT to an existing order (for FPX/pre-paid)
            let finalUpdatedOrder: Order | null = null;
            let redirectUrl: string | undefined = undefined;

            await runTransaction(db, async (transaction) => {
                const originalOrderRef = doc(db, 'orders', originalOrderId);
                const originalOrderDoc = await transaction.get(originalOrderRef);

                if (!originalOrderDoc.exists()) {
                    throw new Error("Original order not found.");
                }
                
                const originalOrderData = originalOrderDoc.data() as Order;

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
                            unit: newItem.unit,
                            hasSst: !!newItem.hasSst,
                            amendmentStatus: 'added' as const,
                        });
                    }
                }
                
                const finalItems = Array.from(updatedItemsMap.values());
                const updatedSubtotal = originalOrderData.subtotal + subtotal;
                const updatedSst = originalOrderData.sst + sst;
                const updatedTotal = originalOrderData.total + total;
                
                 if (originalOrderData.paymentMethod === 'FPX (Toyyibpay)') {
                    const billResponse = await createToyyibpayBill(originalOrderData, total, userData);
                    transaction.update(originalOrderRef, {
                        items: finalItems,
                        subtotal: updatedSubtotal,
                        sst: updatedSst,
                        total: updatedTotal,
                        toyyibpayBillCode: billResponse.billCode,
                        isEditable: false,
                        paymentStatus: 'Pending Confirmation' // Reset for new payment
                    });
                    redirectUrl = billResponse.paymentUrl;
                 } else {
                    transaction.update(originalOrderRef, {
                        items: finalItems,
                        subtotal: updatedSubtotal,
                        sst: updatedSst,
                        total: updatedTotal,
                        isEditable: false,
                    });
                 }
                 
                finalUpdatedOrder = {
                    ...originalOrderData,
                    id: originalOrderId,
                    items: finalItems,
                    subtotal: updatedSubtotal,
                    sst: updatedSst,
                    total: updatedTotal
                };
            });
            
            if (finalUpdatedOrder && finalUpdatedOrder.paymentMethod === 'Cash on Delivery') {
                await sendAmendmentNotifications(finalUpdatedOrder, userData);
            }
            return { redirectUrl };

        } else {
            // This is a NEW order
            const newOrderRef = doc(collection(db, "orders"));
            const newOrderId = newOrderRef.id;
            let redirectUrl: string | undefined = undefined;

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

                let billCode: string | undefined = undefined;
                let paymentStatus: Order['paymentStatus'] = 'Pending Payment';
                let finalPaymentMethod: PaymentMethod = paymentMethod === 'cod' ? 'Cash on Delivery' : 'FPX (Toyyibpay)';

                const tempOrderDataForBill:Partial<Order> = {
                    orderNumber: newOrderNumber,
                };
                
                if (paymentMethod === 'toyyibpay') {
                    const billResponse = await createToyyibpayBill(tempOrderDataForBill as Order, total, userData);
                    billCode = billResponse.billCode;
                    redirectUrl = billResponse.paymentUrl;
                    paymentStatus = 'Pending Confirmation';
                }

                const newOrderData: Omit<Order, 'id'> = {
                    orderNumber: newOrderNumber,
                    user: userData,
                    items: items.map(item => ({
                        productId: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        unit: item.unit,
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
                    paymentMethod: finalPaymentMethod,
                    paymentStatus: paymentStatus,
                    toyyibpayBillCode: billCode,
                    statusHistory: [
                        { status: 'Order Created', timestamp: new Date().toISOString() },
                    ],
                };
                
                transaction.set(newOrderRef, newOrderData);

                // WhatsApp notifications are sent only after successful order creation
                const testPhoneNumber = '60163864181';
                
                let invoiceMessageSection = '';
                let poMessageSection = '';

                if (appUrl) {
                    invoiceMessageSection = `\n\nHere is the unique link to view your invoice:\n${appUrl}/print/invoice/${newOrderId}`;
                    poMessageSection = `\n\nHere is the unique link to view the Purchase Order:\n${appUrl}/admin/print/po/${newOrderId}`;
                }

                const userInvoiceMessage = `Hi ${userData.restaurantName}!\n\nThank you for your order!\n\n*Invoice for Order #${newOrderNumber}*\n\n` +
                `*Delivery Date:* ${new Date(deliveryDate).toLocaleDateString()}\n` +
                `*Delivery Time:* ${deliveryTimeSlot}\n\n` +
                items.map(item => `- ${item.name} (${item.quantity} x RM ${item.price.toFixed(2)})`).join('\n') +
                `\n\nSubtotal: RM ${subtotal.toFixed(2)}\nSST (6%): RM ${sst.toFixed(2)}\n*Total: RM ${total.toFixed(2)}*` +
                `${invoiceMessageSection}\n\n`+
                `We will process your order shortly.`;
                
                await sendWhatsAppMessage(testPhoneNumber, userInvoiceMessage);

                const adminPOMessage = `*New Purchase Order Received*\n\n` +
                    `*Order ID:* ${newOrderNumber}\n` +
                    `*From:* ${userData.restaurantName}\n` +
                    `*Total:* RM ${total.toFixed(2)}*\n\n` +
                    `*Delivery:* ${new Date(deliveryDate).toLocaleDateString()} (${deliveryTimeSlot})\n\n` +
                    `*Items:*\n` +
                    items.map(item => `- ${item.name} (x${item.quantity})`).join('\n') +
                    `${poMessageSection}\n\n` +
                    `Please process the order in the admin dashboard.`;
                
                await sendWhatsAppMessage(testPhoneNumber, `[ADMIN PO] ${adminPOMessage}`);
            });
            return { redirectUrl };
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
    if (!db || !userData) {
      throw new Error("Database not configured or user not logged in.");
    }

    try {
        let finalUpdatedOrder: Order | null = null;
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
                } else if (amendedItem.quantity !== originalItem.quantity) {
                    amendmentStatus = 'updated';
                }

                return {
                    productId: amendedItem.id,
                    name: amendedItem.name,
                    quantity: amendedItem.quantity,
                    price: amendedItem.price,
                    unit: amendedItem.unit,
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

             finalUpdatedOrder = {
                ...originalOrder,
                items: finalItemsWithStatus,
                subtotal: newSubtotal,
                sst: newSst,
                total: newTotal,
            };
        });

        if (finalUpdatedOrder) {
            await sendAmendmentNotifications(finalUpdatedOrder, userData);
        }

    } catch (error: any) {
        console.error("Amend order transaction failed:", error);
        throw new Error(error.message || "An unknown error occurred during the update.");
    }
  };

  const bulkUpdateOrderStatus = async (orderIds: string[], newStatus: OrderStatus) => {
    if (!db) {
      throw new Error("Firestore is not configured. Cannot perform bulk update.");
    }
    const batch = writeBatch(db);
    const ordersToUpdate = orders.filter(order => orderIds.includes(order.id));

    ordersToUpdate.forEach(order => {
        const orderRef = doc(db, 'orders', order.id);
        const newHistoryEntry = { status: newStatus, timestamp: new Date().toISOString() };
        const lastStatus = order.statusHistory[order.statusHistory.length - 1];
        const newHistory = lastStatus.status !== newStatus ? [...order.statusHistory, newHistoryEntry] : order.statusHistory;
        
        batch.update(orderRef, { status: newStatus, statusHistory: newHistory });
    });

    await batch.commit();
  };

  const bulkDeleteOrders = async (orderIds: string[]) => {
    if (!db) {
        throw new Error("Firestore is not configured. Cannot perform bulk delete.");
    }
    const batch = writeBatch(db);
    orderIds.forEach(orderId => {
        const orderRef = doc(db, 'orders', orderId);
        batch.delete(orderRef);
    });
    await batch.commit();
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrder, deleteOrder, amendCodOrder, bulkUpdateOrderStatus, bulkDeleteOrders }}>
      {children}
    </OrderContext.Provider>
  );
}

async function createToyyibpayBill(order: Order, total: number, user: User) {
    const toyyibpaySecretKey = process.env.NEXT_PUBLIC_TOYYIBPAY_SECRET_KEY;
    const toyyibpayCategoryCode = process.env.NEXT_PUBLIC_TOYYIBPAY_CATEGORY_CODE;

    if (!toyyibpaySecretKey || !toyyibpayCategoryCode || !appUrl) {
        throw new Error("Toyyibpay credentials or App URL are not configured on the server.");
    }

    const billAmount = Math.round(total * 100); // Amount in cents

    const billParams = new URLSearchParams({
        'userSecretKey': toyyibpaySecretKey,
        'categoryCode': toyyibpayCategoryCode,
        'billName': `Order ${order.orderNumber}`,
        'billDescription': `Payment for Order #${order.orderNumber} from ${user.restaurantName}`,
        'billPriceSetting': '1', // 1 = Fixed Price
        'billPayorInfo': '1', // 1 = Required
        'billAmount': String(billAmount),
        'billReturnUrl': `${appUrl}/payment/status?order_id=${order.id}`,
        'billCallbackUrl': `${appUrl}/api/toyyibpay/callback`,
        'billExternalReferenceNo': order.orderNumber,
        'billTo': user.personInCharge || user.restaurantName,
        'billEmail': user.email,
        'billPhone': user.phoneNumber?.replace('+', '') || '0123456789'
    });
    
    try {
        const response = await fetch('https://toyyibpay.com/index.php/api/createBill', {
            method: 'POST',
            body: billParams,
        });

        const result = await response.json();
        
        if (response.ok && result.length > 0 && result[0].BillCode) {
            const billCode = result[0].BillCode;
            return {
                billCode,
                paymentUrl: `https://toyyibpay.com/${billCode}`
            };
        } else {
            throw new Error(`Toyyibpay API Error: ${JSON.stringify(result)}`);
        }
    } catch (error) {
        console.error("Failed to create Toyyibpay bill:", error);
        throw new Error("Could not connect to the payment gateway. Please try again later.");
    }
}
