
'use server';

import { verifyDeliveryPhoto, type VerifyDeliveryPhotoOutput } from '@/ai/flows/verify-delivery-photo';
import { generateEInvoice } from '@/ai/flows/generate-e-invoice';
import { EInvoiceInputSchema, type EInvoiceOutput, type Order, type CartItem, type User } from '@/lib/types';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, runTransaction, getCountFromServer, collection, setDoc, getDoc } from 'firebase/firestore';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';

const SST_RATE = 0.06;

// --- Helper Functions ---

async function createToyyibpayBill(orderNumber: string, total: number, user: User, orderId: string) {
    const isSandbox = process.env.TOYYIBPAY_SANDBOX_MODE === 'true';
    const toyyibpayBaseUrl = isSandbox ? 'https://dev.toyyibpay.com' : 'https://toyyibpay.com';

    const toyyibpaySecretKey = process.env.TOYYIBPAY_SECRET_KEY;
    const toyyibpayCategoryCode = process.env.TOYYIBPAY_CATEGORY_CODE;
    const appUrl = process.env.APP_URL;

    if (!toyyibpaySecretKey || !toyyibpayCategoryCode || !appUrl) {
        throw new Error("Toyyibpay credentials or App URL are not configured on the server.");
    }

    const billAmount = Math.round(total * 100);

    const billParams = new URLSearchParams({
        'userSecretKey': toyyibpaySecretKey,
        'categoryCode': toyyibpayCategoryCode,
        'billName': `Order ${orderNumber}`,
        'billDescription': `Payment for Order #${orderNumber} from ${user.restaurantName}`,
        'billPriceSetting': '1',
        'billPayorInfo': '1',
        'billAmount': String(billAmount),
        'billReturnUrl': `${appUrl}/payment/status?doc_id=${orderId}`,
        'billCallbackUrl': `${appUrl}/api/toyyibpay/callback`,
        'billExternalReferenceNo': orderNumber,
        'billTo': user.personInCharge || user.restaurantName,
        'billEmail': user.email,
        'billPhone': user.phoneNumber?.replace('+', '') || '0123456789'
    });

    try {
        const response = await fetch(`${toyyibpayBaseUrl}/index.php/api/createBill`, {
            method: 'POST',
            body: billParams,
        });
        const result = await response.json();
        if (response.ok && result.length > 0 && result[0].BillCode) {
            return {
                billCode: result[0].BillCode,
                paymentUrl: `${toyyibpayBaseUrl}/${result[0].BillCode}`
            };
        } else {
             const errorReason = result[0]?.Reason || result.msg || JSON.stringify(result);
             throw new Error(`Toyyibpay API Error: ${errorReason}`);
        }
    } catch (error) {
        console.error("Failed to create Toyyibpay bill:", error);
        throw new Error("Could not connect to the payment gateway. Please try again later.");
    }
}


async function sendAmendmentNotifications(updatedOrder: Order, user: User) {
    const testPhoneNumber = '60163864181';
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

// --- Server Actions ---

type PlaceOrderState = {
    success: boolean;
    message: string;
    redirectUrl?: string;
}

export async function placeOrderAction(prevState: PlaceOrderState | null, formData: FormData): Promise<PlaceOrderState> {
    if (!db) {
        return { success: false, message: 'Database not configured.' };
    }

    // 1. PARSE FORM DATA
    let items: CartItem[], userData: User, subtotal: number, sst: number, total: number, paymentMethod: 'toyyibpay' | 'cod', deliveryDate: string, deliveryTimeSlot: string, originalOrderId: string | undefined;

    try {
        userData = JSON.parse(formData.get('userData') as string) as User;
        if (!userData) {
            return { success: false, message: 'User data is missing.' };
        }
        items = JSON.parse(formData.get('items') as string) as CartItem[];
        subtotal = parseFloat(formData.get('subtotal') as string);
        sst = parseFloat(formData.get('sst') as string);
        total = parseFloat(formData.get('total') as string);
        paymentMethod = formData.get('paymentMethod') as 'toyyibpay' | 'cod';
        deliveryDate = formData.get('deliveryDate') as string;
        deliveryTimeSlot = formData.get('deliveryTimeSlot') as string;
        originalOrderId = formData.get('originalOrderId') as string | undefined;
    } catch (e) {
        return { success: false, message: "Invalid form data provided." };
    }

    let finalRedirectUrl: string | undefined = undefined;
    let billCode: string | undefined = undefined;
    let newOrderRef: any, newOrderId: string | undefined, newOrderNumber: string | undefined;

    try {
        // 2. EXTERNAL API CALL (if necessary) - Done BEFORE the transaction for stability.
        if (originalOrderId) {
            // This flow is for paying for an FPX amendment and always requires payment.
            const originalOrderRef = doc(db, 'orders', originalOrderId);
            const originalOrderDoc = await getDoc(originalOrderRef);
            if (!originalOrderDoc.exists()) throw new Error("Original order not found.");
            const orderNumber = originalOrderDoc.data().orderNumber;

            const billResponse = await createToyyibpayBill(orderNumber, total, userData, originalOrderId);
            billCode = billResponse.billCode;
            finalRedirectUrl = billResponse.paymentUrl;
        
        } else if (paymentMethod === 'toyyibpay') {
            // New order with FPX payment.
            newOrderRef = doc(collection(db, "orders"));
            newOrderId = newOrderRef.id;

            const snapshot = await getCountFromServer(collection(db, 'orders'));
            const newOrderIndex = snapshot.data().count + 1;
            const datePart = new Date().toLocaleDateString('en-GB').replace(/\//g, '');
            const numberPart = String(newOrderIndex).padStart(4, '0');
            newOrderNumber = `PA${numberPart}${datePart}`;

            const billResponse = await createToyyibpayBill(newOrderNumber, total, userData, newOrderId);
            billCode = billResponse.billCode;
            finalRedirectUrl = billResponse.paymentUrl;
        }

        // 3. DATABASE TRANSACTION
        await runTransaction(db, async (transaction) => {
            if (originalOrderId) {
                // AMENDMENT LOGIC
                const originalOrderRef = doc(db, 'orders', originalOrderId);
                const originalOrderDoc = await transaction.get(originalOrderRef);
                if (!originalOrderDoc.exists()) throw new Error("Original order not found.");
                const originalOrderData = originalOrderDoc.data() as Order;
                
                for (const item of items) {
                    const productRef = doc(db, 'products', item.id);
                    const productDoc = await transaction.get(productRef);
                    if (!productDoc.exists()) throw new Error(`Product "${item.name}" does not exist.`);
                    const currentStock = productDoc.data().stock;
                    if (currentStock < item.quantity) throw new Error(`Not enough stock for "${item.name}".`);
                    transaction.update(productRef, { stock: currentStock - item.quantity });
                }

                const updatedItemsMap = new Map(originalOrderData.items.map(i => [i.productId, { ...i }]));
                for (const newItem of items) {
                     if (updatedItemsMap.has(newItem.id)) {
                        const existingItem = updatedItemsMap.get(newItem.id)!;
                        existingItem.quantity += newItem.quantity;
                        existingItem.amendmentStatus = 'updated';
                    } else {
                        updatedItemsMap.set(newItem.id, {
                            productId: newItem.id, name: newItem.name, quantity: newItem.quantity, price: newItem.price,
                            unit: newItem.unit, hasSst: !!newItem.hasSst, amendmentStatus: 'added' as const,
                        });
                    }
                }
                
                const finalItems = Array.from(updatedItemsMap.values());
                transaction.update(originalOrderRef, {
                    items: finalItems,
                    subtotal: originalOrderData.subtotal + subtotal,
                    sst: originalOrderData.sst + sst,
                    total: originalOrderData.total + total,
                    toyyibpayBillCode: billCode,
                    isEditable: false,
                    status: 'Awaiting Payment',
                    paymentStatus: 'Pending Payment'
                });
            } else {
                // NEW ORDER LOGIC
                for (const item of items) {
                    const productRef = doc(db, 'products', item.id);
                    const productDoc = await transaction.get(productRef);
                    if (!productDoc.exists()) throw new Error(`Product "${item.name}" does not exist.`);
                    const currentStock = productDoc.data().stock;
                    if (currentStock < item.quantity) throw new Error(`Not enough stock for "${item.name}".`);
                    transaction.update(productRef, { stock: currentStock - item.quantity });
                }
                
                let orderStatus: Order['status'] = 'Order Created';
                if (paymentMethod === 'toyyibpay') orderStatus = 'Awaiting Payment';
                
                if (!newOrderRef) { // For COD orders, generate refs and numbers inside transaction
                    newOrderRef = doc(collection(db, "orders"));
                    newOrderId = newOrderRef.id;
                    const snapshot = await getCountFromServer(collection(db, 'orders'));
                    const newOrderIndex = snapshot.data().count + 1;
                    const datePart = new Date().toLocaleDateString('en-GB').replace(/\//g, '');
                    const numberPart = String(newOrderIndex).padStart(4, '0');
                    newOrderNumber = `PA${numberPart}${datePart}`;
                }

                const newOrderData: Omit<Order, 'id'> = {
                    orderNumber: newOrderNumber!, user: userData,
                    items: items.map(item => ({ productId: item.id, name: item.name, quantity: item.quantity, price: item.price, unit: item.unit, hasSst: !!item.hasSst, amendmentStatus: 'original' })),
                    subtotal, sst, total, status: orderStatus, orderDate: new Date().toISOString(), deliveryDate, deliveryTimeSlot,
                    paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : 'FPX (Toyyibpay)', 
                    paymentStatus: 'Pending Payment', toyyibpayBillCode: billCode,
                    statusHistory: [{ status: orderStatus, timestamp: new Date().toISOString() }],
                };
                transaction.set(newOrderRef, newOrderData);
            }
        });

        // 4. POST-TRANSACTION TASKS
        if (!originalOrderId && paymentMethod === 'cod') {
            const appUrl = process.env.APP_URL;
            const testPhoneNumber = '60163864181';
            let invoiceMessageSection = appUrl ? `\n\nHere is the unique link to view your invoice:\n${appUrl}/print/invoice/${newOrderId}` : '';
            let poMessageSection = appUrl ? `\n\nHere is the unique link to view the Purchase Order:\n${appUrl}/admin/print/po/${newOrderId}` : '';
            const userInvoiceMessage = `Hi ${userData.restaurantName}!\n\nThank you for your order!\n\n*Invoice for Order #${newOrderNumber}*\n\n` + `*Delivery Date:* ${new Date(deliveryDate).toLocaleDateString()}\n` + `*Delivery Time:* ${deliveryTimeSlot}\n\n` + items.map(item => `- ${item.name} (${item.quantity} x RM ${item.price.toFixed(2)})`).join('\n') + `\n\nSubtotal: RM ${subtotal.toFixed(2)}\nSST (6%): RM ${sst.toFixed(2)}\n*Total: RM ${total.toFixed(2)}*` + `${invoiceMessageSection}\n\n`+ `We will process your order shortly.`;
            await sendWhatsAppMessage(testPhoneNumber, userInvoiceMessage);
            const adminPOMessage = `*New Purchase Order Received*\n\n` + `*Order ID:* ${newOrderNumber}\n` + `*From:* ${userData.restaurantName}\n` + `*Total:* RM ${total.toFixed(2)}*\n\n` + `*Delivery:* ${new Date(deliveryDate).toLocaleDateString()} (${deliveryTimeSlot})\n\n` + `*Items:*\n` + items.map(item => `- ${item.name} (x${item.quantity})`).join('\n') + `${poMessageSection}\n\n` + `Please process the order in the admin dashboard.`;
            await sendWhatsAppMessage(testPhoneNumber, `[ADMIN PO] ${adminPOMessage}`);
        }
        
        revalidatePath('/orders');
        revalidatePath('/dashboard');
        
        const successMessage = originalOrderId ? `The items have been added to order.` : 'Thank you for your purchase. A confirmation has been sent via WhatsApp.';
        return { success: true, message: successMessage, redirectUrl: finalRedirectUrl };

    } catch (e: any) {
        console.error("Order processing failed: ", e);
        return { success: false, message: e.message || "Failed to process order due to a stock issue or other error." };
    }
}


type AmendOrderState = {
    success: boolean;
    message: string;
}
export async function amendOrderAction(prevState: AmendOrderState | null, formData: FormData): Promise<AmendOrderState> {
    if (!db) {
        return { success: false, message: 'Database not configured.' };
    }

    try {
        const originalOrder = JSON.parse(formData.get('originalOrder') as string) as Order;
        const amendedItems = JSON.parse(formData.get('amendedItems') as string) as CartItem[];
        const userData = JSON.parse(formData.get('userData') as string) as User;

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
    orderId: z.string(),
    photoDataUri: z.string().refine(val => val.startsWith('data:image/'), {
        message: 'Photo must be a valid image data URI',
    }),
});

type VerifyFormState = {
    success: boolean;
    message: string;
    data?: VerifyDeliveryPhotoOutput;
}

export async function verifyDeliveryAction(
    prevState: VerifyFormState | undefined,
    formData: FormData,
): Promise<VerifyFormState> {

    const validatedFields = verifyDeliverySchema.safeParse({
        orderId: formData.get('orderId'),
        photoDataUri: formData.get('photoDataUri'),
    });

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Invalid input. ' + validatedFields.error.flatten().fieldErrors,
        };
    }

    try {
        const result = await verifyDeliveryPhoto({
            orderId: validatedFields.data.orderId,
            photoDataUri: validatedFields.data.photoDataUri,
        });

        return {
            success: true,
            message: 'Verification successful.',
            data: result,
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
    data?: EInvoiceOutput;
}

export async function generateEInvoiceAction(
    prevState: EInvoiceFormState | undefined,
    formData: FormData,
): Promise<EInvoiceFormState> {
    
    let rawData;
    try {
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
        return {
            success: true,
            message: 'E-Invoice generated successfully.',
            data: result,
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
