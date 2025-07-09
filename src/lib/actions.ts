
'use server';

import { verifyDeliveryPhoto } from '@/ai/flows/verify-delivery-photo';
import { generateEInvoice } from '@/ai/flows/generate-e-invoice';
import { EInvoiceInputSchema, type Order, type CartItem, type User, type PaymentMethod, type OrderStatus } from '@/lib/types';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, runTransaction, getCountFromServer, collection, getDoc, updateDoc } from 'firebase/firestore';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';
import { createToyyibpayBill } from '@/lib/toyyibpay';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';

const SST_RATE = 0.06;

async function sendAmendmentNotifications(updatedOrder: Order, user: User) {
    const adminPhoneNumber = '60163864181'; // Hardcoded admin number
    const appUrl = 'https://studio--pasargo-central.us-central1.hosted.app/';

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
    
    const invoiceLink = `\n\nHere is the unique link to view your updated invoice:\n${appUrl}/print/invoice/${updatedOrder.id}`;
    const poLink = `\n\nView the updated Purchase Order here:\n${appUrl}/admin/print/po/${updatedOrder.id}`;

    const userMessage = `Hi ${user.restaurantName}!\n\nYour Order #${updatedOrder.orderNumber} has been successfully *UPDATED*.\n\n` +
    `*Delivery remains scheduled for:* ${format(new Date(updatedOrder.deliveryDate), 'dd/MM/yyyy')} at ${updatedOrder.deliveryTimeSlot}\n\n` +
    `*Updated Items:*\n` +
    itemsSummary +
    `\n\nSubtotal: RM ${updatedOrder.subtotal.toFixed(2)}\nSST (6%): RM ${updatedOrder.sst.toFixed(2)}\n*New Total: RM ${updatedOrder.total.toFixed(2)}*` +
    invoiceLink +
    `\n\nWe will process your updated order shortly.`;
    
    // Send user notification to the test number
    await sendWhatsAppMessage(adminPhoneNumber, userMessage);

    const adminMessage = `*Order Amended*\n\n` +
    `Order *#${updatedOrder.orderNumber}* for *${user.restaurantName}* has been updated.\n\n` +
    `*New Total: RM ${updatedOrder.total.toFixed(2)}*\n\n` +
    `*Updated Items:*\n` +
    adminItemsSummary +
    poLink;

    await sendWhatsAppMessage(adminPhoneNumber, `[ADMIN PO UPDATE] ${adminMessage}`);
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
    paymentMethod: PaymentMethod;
};

export async function placeOrderAction(payload: PlaceOrderPayload): Promise<{ success: boolean, message: string, orderId?: string }> {
    if (!db) {
        return { success: false, message: 'Database not configured.' };
    }

    const { items, subtotal, sst, total, deliveryDate, deliveryTimeSlot, userData, paymentMethod } = payload;
    const { id: userId, ...userToSave } = userData;

    if (items.length === 0) return { success: false, message: "Cannot place an order with an empty cart." };
    if (!deliveryDate || !deliveryTimeSlot) return { success: false, message: "Delivery date and time slot are required." };

    try {
        const newOrderRef = doc(collection(db, "orders"));
        let newOrderNumber: string;

        await runTransaction(db, async (transaction) => {
            // 1. Decrease stock for each item
            for (const item of items) {
                const productRef = doc(db, 'products', item.id);
                const productDoc = await transaction.get(productRef);
                if (!productDoc.exists()) throw new Error(`Product "${item.name}" does not exist.`);
                const currentStock = productDoc.data().stock;
                if (currentStock < item.quantity) throw new Error(`Not enough stock for "${item.name}".`);
                transaction.update(productRef, { stock: currentStock - item.quantity });
            }
            
            // 2. Generate a new unique order number
            const snapshot = await getCountFromServer(collection(db, 'orders'));
            const newOrderIndex = snapshot.data().count + 1;
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = String(now.getFullYear()).slice(-2);
            const datePart = `${day}${month}${year}`;
            const numberPart = String(newOrderIndex).padStart(4, '0');
            newOrderNumber = `PA${numberPart}${datePart}`;

            // 3. Create the new order object
            const status: OrderStatus = paymentMethod === 'FPX (Toyyibpay)' ? 'Awaiting Payment' : 'Order Created';
            const paymentStatus: Order['paymentStatus'] = paymentMethod === 'FPX (Toyyibpay)' ? 'Awaiting Payment' : 'Pending Payment';

            const newOrderData: Omit<Order, 'id'> = {
                orderNumber: newOrderNumber,
                user: userData,
                items: items.map(item => ({ productId: item.id, name: item.name, quantity: item.quantity, price: item.price, unit: item.unit, hasSst: !!item.hasSst, amendmentStatus: 'original' })),
                subtotal, sst, total,
                status,
                paymentStatus,
                paymentMethod,
                orderDate: new Date().toISOString(),
                deliveryDate, deliveryTimeSlot,
                statusHistory: [{ status, timestamp: new Date().toISOString() }],
            };
            
            // 4. Set the new order in the transaction
            transaction.set(newOrderRef, newOrderData);
        });

        const fullOrderData = await getDoc(newOrderRef).then(doc => ({ id: doc.id, ...doc.data() } as Order));

        // 5. Send notifications AFTER the transaction is successful, ONLY for COD
        if (paymentMethod === 'Cash on Delivery') {
           await sendOrderConfirmationNotifications(newOrderRef.id);
        } else if (paymentMethod === 'FPX (Toyyibpay)') {
            // For FPX, we immediately call initiatePaymentAction to get the redirect URL
            await initiatePaymentAction(fullOrderData);
        }

        // 6. Revalidate paths to update caches
        revalidatePath('/orders');
        revalidatePath('/dashboard');
        revalidatePath(`/orders/${newOrderRef.id}`);

        const message = paymentMethod === 'Cash on Delivery'
            ? 'Order created successfully! A confirmation has been sent via WhatsApp.'
            : 'Order created. Please proceed to payment.';

        return { success: true, message, orderId: newOrderRef.id };

    } catch (e: any) {
        console.error("Order failed: ", e);
        return { success: false, message: e.message || "Failed to process order." };
    }
}


export async function initiatePaymentAction(order: Order) {
    if (!order.user) {
        throw new Error("User data is missing from the order.");
    }
    
    // Create Toyyibpay Bill
    const { billCode, paymentUrl } = await createToyyibpayBill(order, order.user);

    // Redirect to payment gateway
    redirect(paymentUrl);
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

export async function cancelAwaitingPaymentOrderAction(orderId: string): Promise<{ success: boolean; message: string }> {
    if (!db) {
        return { success: false, message: 'Database not configured.' };
    }
    if (!orderId) {
        return { success: false, message: 'Order ID is required.' };
    }

    try {
        await runTransaction(db, async (transaction) => {
            const orderRef = doc(db, 'orders', orderId);
            const orderDoc = await transaction.get(orderRef);

            if (!orderDoc.exists()) {
                throw new Error('Order not found.');
            }

            const order = orderDoc.data() as Order;

            if (order.status !== 'Awaiting Payment') {
                throw new Error('This order cannot be cancelled as it is not awaiting payment.');
            }

            // Return stock for each item
            for (const item of order.items) {
                const productRef = doc(db, 'products', item.productId);
                const productDoc = await transaction.get(productRef);
                if (productDoc.exists()) {
                    const currentStock = productDoc.data().stock;
                    transaction.update(productRef, { stock: currentStock + item.quantity });
                }
            }

            // Update order status
            const newStatus: OrderStatus = 'Cancelled';
            const newHistory = [...order.statusHistory, { status: newStatus, timestamp: new Date().toISOString() }];
            
            transaction.update(orderRef, { 
                status: newStatus, 
                paymentStatus: 'Failed',
                statusHistory: newHistory 
            });
        });

        revalidatePath('/orders');
        revalidatePath('/dashboard');
        
        return { success: true, message: 'Order has been successfully cancelled.' };

    } catch (e: any) {
        console.error("Cancel order failed: ", e);
        return { success: false, message: e.message || "Failed to cancel the order." };
    }
}

export async function sendOrderConfirmationNotifications(orderId: string): Promise<{ success: boolean; message: string }> {
    if (!db) return { success: false, message: "Database not configured." };
    if (!orderId) return { success: false, message: "Order ID is missing." };

    try {
        const orderRef = doc(db, 'orders', orderId);
        const orderDoc = await getDoc(orderRef);
        if (!orderDoc.exists()) throw new Error("Order not found.");

        const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;

        // Send notifications
        const { user, orderNumber, items, subtotal, sst, total, deliveryDate, deliveryTimeSlot, id: orderDocId } = orderData;
        const testPhoneNumber = '60163864181';
        const appUrl = 'https://studio--pasargo-central.us-central1.hosted.app';
        let invoiceMessageSection = appUrl ? `\n\nHere is the unique link to view your invoice:\n${appUrl}/print/invoice/${orderDocId}` : '';
        let poMessageSection = appUrl ? `\n\nHere is the unique link to view the Purchase Order:\n${appUrl}/admin/print/po/${orderDocId}` : '';
        
        const userInvoiceMessage = `Hi ${user.restaurantName}!\n\nThank you for your order!\n\n*Invoice for Order #${orderNumber}*\n\n` + `*Delivery Date:* ${format(new Date(deliveryDate), 'dd/MM/yyyy')}\n` + `*Delivery Time:* ${deliveryTimeSlot}\n\n` + items.map(item => `- ${item.name} (${item.quantity} x RM ${item.price.toFixed(2)})`).join('\n') + `\n\nSubtotal: RM ${subtotal.toFixed(2)}\nSST (6%): RM ${sst.toFixed(2)}\n*Total: RM ${total.toFixed(2)}*` + `${invoiceMessageSection}\n\n`+ `We will process your order shortly.`;
        await sendWhatsAppMessage(testPhoneNumber, userInvoiceMessage);
        
        const adminPOMessage = `*New Purchase Order Received*\n\n` + `*Order ID:* ${orderNumber}\n` + `*From:* ${user.restaurantName}\n` + `*Total:* RM ${total.toFixed(2)}*\n\n` + `*Delivery:* ${format(new Date(deliveryDate), 'dd/MM/yyyy')} (${deliveryTimeSlot})\n\n` + `*Items:*\n` + items.map(item => `- ${item.name} (x${item.quantity})`).join('\n') + `${poMessageSection}\n\n` + `Please process the order in the admin dashboard.`;
        await sendWhatsAppMessage(testPhoneNumber, `[ADMIN PO] ${adminPOMessage}`);

        revalidatePath(`/orders/${orderId}`);
        revalidatePath('/dashboard');
        revalidatePath('/admin/dashboard');

        return { success: true, message: "Notifications sent." };
    } catch (e: any) {
        console.error("Error sending notifications:", e);
        return { success: false, message: e.message || "An unexpected error occurred." };
    }
}
