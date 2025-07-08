
'use server';

import { verifyDeliveryPhoto } from '@/ai/flows/verify-delivery-photo';
import { generateEInvoice } from '@/ai/flows/generate-e-invoice';
import { EInvoiceInputSchema, type Order, type CartItem, type User } from '@/lib/types';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, runTransaction, getCountFromServer, collection, getDoc, updateDoc } from 'firebase/firestore';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';

const SST_RATE = 0.06;

async function sendAmendmentNotifications(updatedOrder: Order, user: User) {
    const adminPhoneNumber = '60163864181'; // Hardcoded admin number
    const appUrl = process.env.APP_URL;

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
    (appUrl ? `\n\nHere is the unique link to view your updated invoice:\n${appUrl}/print/invoice/${updatedOrder.id}` : '') +
    `\n\nWe will process your updated order shortly.`;
    
    // Send user notification to the test number
    const userResult = await sendWhatsAppMessage(adminPhoneNumber, userMessage);
    if (!userResult.success) {
        console.error(`Failed to send user amendment notification for order ${updatedOrder.orderNumber}:`, userResult.error);
    }

    const adminMessage = `*Order Amended*\n\n` +
    `Order *#${updatedOrder.orderNumber}* for *${user.restaurantName}* has been updated.\n\n` +
    `*New Total: RM ${updatedOrder.total.toFixed(2)}*\n\n` +
    `*Updated Items:*\n` +
    adminItemsSummary +
    (appUrl ? `\n\nView the updated Purchase Order here:\n${appUrl}/admin/print/po/${updatedOrder.id}` : '');

    const adminResult = await sendWhatsAppMessage(adminPhoneNumber, `[ADMIN PO UPDATE] ${adminMessage}`);
     if (!adminResult.success) {
        console.error(`Failed to send admin amendment notification for order ${updatedOrder.orderNumber}:`, adminResult.error);
    }
};

// --- Server Actions ---

type PlaceOrderPayload = {
    items: CartItem[];
    subtotal: number;
    sst: number;
    total: number;
    deliveryDate: string;
    deliveryTimeSlot: string;
    userData: User;
    originalOrderId?: string;
};

export async function placeOrderAction(payload: PlaceOrderPayload): Promise<{ success: boolean, message: string }> {
    if (!db) {
        return { success: false, message: 'Database not configured.' };
    }

    const { items, subtotal, sst, total, deliveryDate, deliveryTimeSlot, userData } = payload;

    if (items.length === 0) return { success: false, message: "Cannot place an order with an empty cart." };
    if (!deliveryDate || !deliveryTimeSlot) return { success: false, message: "Delivery date and time slot are required." };

    try {
        const newOrderRef = doc(collection(db, "orders"));
        let newOrderNumber: string;

        await runTransaction(db, async (transaction) => {
            for (const item of items) {
                const productRef = doc(db, 'products', item.id);
                const productDoc = await transaction.get(productRef);
                if (!productDoc.exists()) throw new Error(`Product "${item.name}" does not exist.`);
                const currentStock = productDoc.data().stock;
                if (currentStock < item.quantity) throw new Error(`Not enough stock for "${item.name}".`);
                transaction.update(productRef, { stock: currentStock - item.quantity });
            }
            
            const snapshot = await getCountFromServer(collection(db, 'orders'));
            const newOrderIndex = snapshot.data().count + 1;
            const datePart = new Date().toLocaleDateString('en-GB').replace(/\//g, '');
            const numberPart = String(newOrderIndex).padStart(4, '0');
            newOrderNumber = `PA${numberPart}${datePart}`;

            const newOrderData: Omit<Order, 'id'> = {
                orderNumber: newOrderNumber,
                user: userData,
                items: items.map(item => ({ productId: item.id, name: item.name, quantity: item.quantity, price: item.price, unit: item.unit, hasSst: !!item.hasSst, amendmentStatus: 'original' })),
                subtotal, sst, total,
                status: 'Order Created',
                paymentStatus: 'Pending Payment',
                paymentMethod: 'Cash on Delivery',
                orderDate: new Date().toISOString(),
                deliveryDate, deliveryTimeSlot,
                statusHistory: [{ status: 'Order Created', timestamp: new Date().toISOString() }],
            };
            transaction.set(newOrderRef, newOrderData);
        });

        // Post-transaction notifications
        const appUrl = process.env.APP_URL;
        const adminPhoneNumber = '60163864181';
        
        const invoiceMessageSection = appUrl ? `\n\nHere is the unique link to view your invoice:\n${appUrl}/print/invoice/${newOrderRef.id}` : '';
        const poMessageSection = appUrl ? `\n\nHere is the unique link to view the Purchase Order:\n${appUrl}/admin/print/po/${newOrderRef.id}` : '';
        
        const userInvoiceMessage = `Hi ${userData.restaurantName}!\n\nThank you for your order!\n\n*Invoice for Order #${newOrderNumber!}*\n\n` + `*Delivery Date:* ${new Date(deliveryDate).toLocaleDateString()}\n` + `*Delivery Time:* ${deliveryTimeSlot}\n\n` + items.map(item => `- ${item.name} (${item.quantity} x RM ${item.price.toFixed(2)})`).join('\n') + `\n\nSubtotal: RM ${subtotal.toFixed(2)}\nSST (6%): RM ${sst.toFixed(2)}\n*Total: RM ${total.toFixed(2)}*` + `${invoiceMessageSection}\n\n`+ `We will process your order shortly.`;
        
        // Send user notification to the test number
        const userResult = await sendWhatsAppMessage(adminPhoneNumber, userInvoiceMessage);
        if (!userResult.success) {
            console.error(`Failed to send user notification for order ${newOrderNumber!}:`, userResult.error);
        }

        const adminPOMessage = `*New Purchase Order Received*\n\n` + `*Order ID:* ${newOrderNumber!}\n` + `*From:* ${userData.restaurantName}\n` + `*Total:* RM ${total.toFixed(2)}*\n\n` + `*Delivery:* ${new Date(deliveryDate).toLocaleDateString()} (${deliveryTimeSlot})\n\n` + `*Items:*\n` + items.map(item => `- ${item.name} (x${item.quantity})`).join('\n') + `${poMessageSection}\n\n` + `Please process the order in the admin dashboard.`;
        
        const adminResult = await sendWhatsAppMessage(adminPhoneNumber, `[ADMIN PO] ${adminPOMessage}`);
        if (!adminResult.success) {
            console.error(`Failed to send admin notification for order ${newOrderNumber!}:`, adminResult.error);
        }

        revalidatePath('/orders');
        revalidatePath('/dashboard');
        return { success: true, message: 'Thank you for your purchase. A confirmation has been sent via WhatsApp.' };

    } catch (e: any) {
        console.error("COD Order failed: ", e);
        return { success: false, message: e.message || "Failed to process order." };
    }
}


type AmendOrderPayload = {
  originalOrder: Order;
  amendedItems: CartItem[];
  userData: User;
};

export async function amendOrderAction(payload: AmendOrderPayload): Promise<{ success: boolean; message: string; }> {
    if (!db) {
        return { success: false, message: 'Database not configured.' };
    }

    const { originalOrder, amendedItems, userData } = payload;

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
                if (diff !== 0) stockAdjustments.set(itemId, diff);
            }

            const productRefs = Array.from(stockAdjustments.keys()).map(id => doc(db, 'products', id));
            const productDocs = productRefs.length > 0 ? await Promise.all(productRefs.map(ref => transaction.get(ref))) : [];
            
            for (let i = 0; i < productDocs.length; i++) {
                const productDoc = productDocs[i];
                if (!productDoc.exists()) throw new Error(`Product with ID ${productRefs[i].id} not found.`);
                const adjustment = stockAdjustments.get(productRefs[i].id)!;
                const currentStock = productDoc.data().stock;
                if (adjustment < 0 && currentStock < Math.abs(adjustment)) {
                    throw new Error(`Not enough stock for ${productDoc.data().name}. Only ${currentStock} available.`);
                }
                transaction.update(productRefs[i], { stock: currentStock + adjustment });
            }

            const newSubtotal = amendedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const newSst = amendedItems.reduce((sum, item) => item.hasSst ? sum + (item.price * item.quantity * SST_RATE) : sum, 0);
            const newTotal = newSubtotal + newSst;
            
            const finalItemsWithStatus: Order['items'] = amendedItems.map(amendedItem => {
                const originalItem = originalOrder.items.find(i => i.productId === amendedItem.id);
                let amendmentStatus: Order['items'][0]['amendmentStatus'] = 'original';

                if (!originalItem) amendmentStatus = 'added';
                else if (amendedItem.quantity !== originalItem.quantity) amendmentStatus = 'updated';

                return { ...amendedItem, productId: amendedItem.id, amendmentStatus };
            });

            transaction.update(orderRef, { items: finalItemsWithStatus, subtotal: newSubtotal, sst: newSst, total: newTotal, isEditable: false });
            finalUpdatedOrder = { ...originalOrder, items: finalItemsWithStatus, subtotal: newSubtotal, sst: newSst, total: newTotal };
        });

        if (finalUpdatedOrder) {
            await sendAmendmentNotifications(finalUpdatedOrder, userData);
        }
        revalidatePath(`/orders/${originalOrder.id}`);
        return { success: true, message: 'Order updated successfully!' };
    } catch (e: any) {
        console.error("Amend order transaction failed:", e);
        return { success: false, message: e.message || 'An unknown error occurred during the update.' };
    }
}


const verifyDeliverySchema = z.object({
    orderNumber: z.string(),
    orderDocId: z.string(),
    photoDataUri: z.string().refine(val => val.startsWith('data:image/'), {
        message: 'Photo must be a valid image data URI',
    }),
});

type VerifyFormState = {
    success: boolean;
    message: string;
}

export async function verifyDeliveryAction(
    prevState: VerifyFormState | undefined,
    formData: FormData,
): Promise<VerifyFormState> {

    const validatedFields = verifyDeliverySchema.safeParse({
        orderNumber: formData.get('orderNumber'),
        orderDocId: formData.get('orderDocId'),
        photoDataUri: formData.get('photoDataUri'),
    });

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Invalid input. ' + JSON.stringify(validatedFields.error.flatten().fieldErrors),
        };
    }

    try {
        const result = await verifyDeliveryPhoto({
            orderId: validatedFields.data.orderNumber,
            photoDataUri: validatedFields.data.photoDataUri,
        });

        if (!db) {
            return { success: false, message: 'Database not configured.' };
        }
        const orderRef = doc(db, 'orders', validatedFields.data.orderDocId);
        const orderDoc = await getDoc(orderRef);
        if (!orderDoc.exists()) {
            return { success: false, message: 'Order not found.' };
        }
        const orderData = orderDoc.data() as Order;

        const verificationData = {
            ...result,
            verifiedAt: new Date().toISOString()
        };
        
        let newStatus = orderData.status;
        let newStatusHistory = orderData.statusHistory;

        if (result.isOrderCompleted && orderData.status !== 'Completed') {
            newStatus = 'Completed';
            const newHistoryEntry = { status: 'Completed' as const, timestamp: new Date().toISOString() };
            if (!newStatusHistory.find(h => h.status === 'Completed')) {
                newStatusHistory = [...orderData.statusHistory, newHistoryEntry];
            }
        }
        
        await updateDoc(orderRef, { 
            deliveryVerification: verificationData,
            deliveryPhotoUrl: validatedFields.data.photoDataUri,
            status: newStatus,
            statusHistory: newStatusHistory
        });

        revalidatePath(`/orders/${validatedFields.data.orderDocId}`);
        revalidatePath(`/admin/dashboard/orders/${validatedFields.data.orderDocId}`);

        return {
            success: true,
            message: 'Verification successful and order updated.',
        };

    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return {
            success: false,
            message: `AI verification failed: ${errorMessage}`,
        };
    }
}


type EInvoiceFormState = {
    success: boolean;
    message: string;
}

export async function generateEInvoiceAction(
    prevState: EInvoiceFormState | undefined,
    formData: FormData,
): Promise<EInvoiceFormState> {
    
    let rawData;
    let orderDocId: string;
    try {
        orderDocId = formData.get('orderDocId') as string;
        rawData = {
            orderId: formData.get('orderId'),
            orderDate: formData.get('orderDate'),
            total: parseFloat(formData.get('total') as string),
            items: JSON.parse(formData.get('items') as string),
            seller: JSON.parse(formData.get('seller') as string),
            buyer: JSON.parse(formData.get('buyer') as string),
        };
    } catch (e) {
        return { success: false, message: "Failed to parse form data." }
    }


    const validatedFields = EInvoiceInputSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Invalid input for e-invoice. ' + validatedFields.error.flatten().fieldErrors,
        };
    }

    try {
        const result = await generateEInvoice(validatedFields.data);
        
        if (!db) {
            return { success: false, message: 'Database not configured.' };
        }
        const orderRef = doc(db, 'orders', orderDocId);
        await updateDoc(orderRef, { eInvoice: result });

        revalidatePath(`/orders/${orderDocId}`);

        return {
            success: true,
            message: 'E-Invoice generated successfully.',
        };

    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return {
            success: false,
            message: `E-Invoice generation failed: ${errorMessage}`,
        };
    }
}
