
'use server';

import { z } from 'zod';
import type { Order, CartItem, User, PaymentMethod, OrderStatus, Language } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, writeBatch, runTransaction, getCountFromServer } from 'firebase/firestore';
import { getTranslation, getTranslatedItemField } from './translations';
import { sendWhatsAppMessage } from './whatsapp';

const placeOrderPayload = z.object({
  cartItems: z.any(),
  userData: z.any(),
  deliveryDate: z.string(),
  deliveryTimeSlot: z.string(),
  language: z.enum(['en', 'ms', 'th']),
  originalOrderId: z.string().optional(),
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

export async function sendOrderConfirmationNotifications(orderId: string) {
    if (!db) {
        console.error("Cannot send notifications: Firestore is not available.");
        return;
    }
    const orderDocRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderDocRef);
    if (!orderDoc.exists()) {
        console.error(`Cannot send notifications: Order with ID ${orderId} not found.`);
        return;
    }

    const order = { id: orderDoc.id, ...orderDoc.data() } as Order;
    const { user, orderNumber, items, subtotal, sst, total, deliveryDate, deliveryTimeSlot, language = 'en' } = order;
    
    const adminPhoneNumber = '60163864181'; // Hardcoded admin number
    
    let invoiceMessageSection = appUrl ? `\n\n${getTranslation(language, 'whatsapp.view_invoice_prompt')}\n${appUrl}/print/invoice/${orderId}` : '';
    let poMessageSection = appUrl ? `\n\nHere is the unique link to view the Purchase Order:\n${appUrl}/admin/print/po/${orderId}` : '';
    
    const itemsList = items.map(item => `- ${getTranslatedItemField(item, 'name', language)} (${item.quantity} x RM ${item.price.toFixed(2)})`).join('\n');
    const userInvoiceMessage = `${getTranslation(language, 'whatsapp.greeting', {name: user.restaurantName})}\n\n${getTranslation(language, 'whatsapp.order_confirmation')}\n\n*${getTranslation(language, 'whatsapp.invoice_title', {orderNumber})}*\n\n` +
        `*${getTranslation(language, 'whatsapp.delivery_date')}:* ${format(new Date(deliveryDate), 'dd/MM/yyyy')}\n` +
        `*${getTranslation(language, 'whatsapp.delivery_time')}:* ${deliveryTimeSlot}\n\n` +
        itemsList +
        `\n\n${getTranslation(language, 'invoice.subtotal')}: RM ${subtotal.toFixed(2)}\n${getTranslation(language, 'invoice.sst')}: RM ${sst.toFixed(2)}\n*${getTranslation(language, 'invoice.total')}: RM ${total.toFixed(2)}*` +
        `${invoiceMessageSection}\n\n`+
        `${getTranslation(language, 'whatsapp.outro')}`;
        
    if (user.phoneNumber) {
      await sendWhatsAppMessage(user.phoneNumber, userInvoiceMessage);
    }
    
    const adminPOMessage = `*New Purchase Order Received*\n\n` +
        `*Order ID:* ${orderNumber}\n` +
        `*From:* ${user.restaurantName}\n` +
        `*Total:* RM ${total.toFixed(2)}\n\n` +
        `*Delivery:* ${format(new Date(deliveryDate), 'dd/MM/yyyy')} (${deliveryTimeSlot})\n\n` +
        `*Items:*\n` +
        items.map(item => `- ${item.name} (x${item.quantity})`).join('\n') +
        `${poMessageSection}\n\n` +
        `Please process the order in the admin dashboard.`;
        
    await sendWhatsAppMessage(adminPhoneNumber, `[ADMIN PO] ${adminPOMessage}`);
}


async function sendAmendmentConfirmationNotifications(updatedOrder: Order) {
    const { user, orderNumber, items, subtotal, sst, total, deliveryDate, deliveryTimeSlot, id: orderDocId, language = 'en' } = updatedOrder;
    const adminPhoneNumber = '60163864181';

    const itemsSummary = items.map(item => {
        let statusTag = '';
        if (item.amendmentStatus === 'added') statusTag = ` [${getTranslation(language, 'whatsapp.item_added')}]`;
        else if (item.amendmentStatus === 'updated') statusTag = ` [${getTranslation(language, 'whatsapp.item_updated')}]`;
        return `- ${getTranslatedItemField(item, 'name', language)} (${item.quantity} x RM ${item.price.toFixed(2)})${statusTag}`;
    }).join('\n');

    const adminItemsSummary = items.map(item => {
        let statusTag = '';
        if (item.amendmentStatus === 'added') statusTag = ' [Added]';
        else if (item.amendmentStatus === 'updated') statusTag = ' [Updated]';
        return `- ${item.name} (x${item.quantity})${statusTag}`;
    }).join('\n');

    const userMessage = `${getTranslation(language, 'whatsapp.greeting', {name: user.restaurantName})}\n\n${getTranslation(language, 'whatsapp.order_updated')}\n\n` +
        `*${getTranslation(language, 'whatsapp.delivery_remains')}:* ${format(new Date(deliveryDate), 'dd/MM/yyyy')} ${getTranslation(language, 'at')} ${deliveryTimeSlot}\n\n` +
        `*${getTranslation(language, 'whatsapp.updated_items')}:*\n` +
        itemsSummary +
        `\n\n${getTranslation(language, 'invoice.subtotal')}: RM ${subtotal.toFixed(2)}\n${getTranslation(language, 'invoice.sst')}: RM ${sst.toFixed(2)}\n*${getTranslation(language, 'whatsapp.new_total')}: RM ${total.toFixed(2)}*` +
        `\n\n${getTranslation(language, 'whatsapp.view_invoice_prompt')}\n${appUrl}/print/invoice/${orderDocId}`;
        
    if (user.phoneNumber) {
      await sendWhatsAppMessage(user.phoneNumber, userMessage);
    }

    const adminMessage = `*Order Amended*\n\n` +
        `Order *#${orderNumber}* for *${user.restaurantName}* has been updated.\n\n` +
        `*New Total: RM ${total.toFixed(2)}*\n\n` +
        `*Updated Items:*\n` +
        adminItemsSummary +
        `\n\nView the updated Purchase Order here:\n${appUrl}/admin/print/po/${orderDocId}`;
        
    await sendWhatsAppMessage(adminPhoneNumber, `[ADMIN PO UPDATE] ${adminMessage}`);
}

import { format } from 'date-fns';

export async function placeOrderAction(payload: z.infer<typeof placeOrderPayload>): Promise<{ success: boolean; message: string; }> {
    const validation = placeOrderPayload.safeParse(payload);
    if (!validation.success) {
        return { success: false, message: "Invalid data provided." };
    }
    
    const { cartItems, userData, deliveryDate, deliveryTimeSlot, language, originalOrderId } = validation.data;
    
    if (!db) {
        return { success: false, message: "Database service is not available." };
    }

    const subtotal = cartItems.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
    const sst = cartItems.reduce((sum: number, item: CartItem) => {
        if (item.hasSst) {
          return sum + (item.price * item.quantity * 0.06);
        }
        return sum;
    }, 0);
    const total = subtotal + sst;

    try {
        if (originalOrderId) {
            // This is an AMENDMENT to an existing order.
            let finalUpdatedOrder: Order | null = null;
            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", originalOrderId);
                const orderDoc = await transaction.get(orderRef);

                if (!orderDoc.exists()) {
                    throw new Error("Original order not found.");
                }

                const originalOrderData = orderDoc.data() as Order;
                
                const updatedItemsMap = new Map(originalOrderData.items.map(i => [`${i.productId}_${i.variantId}`, { ...i }]));

                for (const newItem of cartItems) {
                    const key = `${newItem.productId}_${newItem.variantId}`;
                    if (updatedItemsMap.has(key)) {
                        const existingItem = updatedItemsMap.get(key)!;
                        existingItem.quantity += newItem.quantity;
                        existingItem.amendmentStatus = 'updated';
                    } else {
                        updatedItemsMap.set(key, {
                            productId: newItem.productId,
                            variantId: newItem.variantId,
                            name: newItem.productName,
                            name_ms: newItem.productName_ms,
                            name_th: newItem.productName_th,
                            variantName: newItem.variantName,
                            quantity: newItem.quantity,
                            price: newItem.price,
                            unit: newItem.unit,
                            hasSst: !!newItem.hasSst,
                            amendmentStatus: 'added',
                        });
                    }
                }
                
                const finalItems = Array.from(updatedItemsMap.values());
                const finalSubtotal = finalItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
                const finalSst = finalItems.reduce((sum, item) => item.hasSst ? sum + (item.price * item.quantity * 0.06) : sum, 0);
                const finalTotal = finalSubtotal + finalSst;
                
                transaction.update(orderRef, {
                    items: finalItems,
                    subtotal: finalSubtotal,
                    sst: finalSst,
                    total: finalTotal,
                    isEditable: false,
                    paymentStatus: 'Awaiting Payment'
                });

                finalUpdatedOrder = {
                    ...originalOrderData,
                    id: originalOrderId,
                    items: finalItems,
                    subtotal: finalSubtotal,
                    sst: finalSst,
                    total: finalTotal,
                };
            });

            if (finalUpdatedOrder) {
                await sendAmendmentConfirmationNotifications(finalUpdatedOrder);
            }
            return { success: true, message: getTranslation(language, 'order_amendment.toast.updated_title') };

        } else {
            // This is a NEW order
            const snapshot = await getCountFromServer(collection(db, 'orders'));
            const newOrderIndex = snapshot.data().count + 1;
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = String(now.getFullYear()).slice(-2);
            const datePart = `${day}${month}${year}`;
            const numberPart = String(newOrderIndex).padStart(4, '0');
            const newOrderNumber = `PA${numberPart}${datePart}`;

            const newOrder: Omit<Order, 'id'> = {
                orderNumber: newOrderNumber,
                user: userData,
                language: language,
                items: cartItems.map((item: CartItem) => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    name: item.productName,
                    name_ms: item.productName_ms,
                    name_th: item.productName_th,
                    variantName: item.variantName,
                    quantity: item.quantity,
                    price: item.price,
                    unit: item.unit,
                    hasSst: !!item.hasSst,
                    amendmentStatus: 'original',
                })),
                subtotal,
                sst,
                total,
                status: 'Awaiting Payment',
                orderDate: new Date().toISOString(),
                deliveryDate,
                deliveryTimeSlot,
                paymentMethod: 'Cash on Delivery',
                paymentStatus: 'Awaiting Payment',
                statusHistory: [
                    { status: 'Awaiting Payment', timestamp: new Date().toISOString() },
                ],
            };
            
            const newOrderRef = await addDoc(collection(db, 'orders'), newOrder);
            await sendOrderConfirmationNotifications(newOrderRef.id);
            return { success: true, message: getTranslation(language, 'checkout.toast.success_title') };
        }
    } catch(e: any) {
        console.error("Failed to place order:", e);
        return { success: false, message: e.message || "An unknown error occurred." };
    }
}


export async function amendOrderAction(payload: any): Promise<{ success: boolean; message: string; }> {
    console.log("Firebase removed. amendOrderAction called with (simulation):", payload);
    return { success: true, message: 'Order updated successfully (simulation)!' };
}

export async function verifyDeliveryAction(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; }> {
    console.log("Firebase removed. verifyDeliveryAction called with (simulation).");
    return { success: true, message: 'Verification successful (simulation).' };
}

export async function generateEInvoiceAction(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; }> {
    console.log("Firebase removed. generateEInvoiceAction called with (simulation).");
    return { success: false, message: 'E-Invoice generation failed (simulation).' };
}

export async function cancelAwaitingPaymentOrderAction(orderId: string): Promise<{ success: boolean; message: string }> {
     if (!db) {
        return { success: false, message: "Database not configured." };
    }
    try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            status: 'Cancelled',
            paymentStatus: 'Failed',
        });
        return { success: true, message: 'Order has been successfully cancelled.' };
    } catch(e: any) {
        return { success: false, message: `Failed to cancel order: ${e.message}` };
    }
}
