
'use server';

import { verifyDeliveryPhoto, type VerifyDeliveryPhotoOutput } from '@/ai/flows/verify-delivery-photo';
import { generateEInvoice } from '@/ai/flows/generate-e-invoice';
import { EInvoiceInputSchema, type EInvoiceOutput, type Order } from '@/lib/types';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, runTransaction } from 'firebase/firestore';

const SST_RATE = 0.06;

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


const amendOrderSchema = z.object({
    orderId: z.string(),
    originalItems: z.preprocess((val) => typeof val === 'string' ? JSON.parse(val) : val, z.array(z.any())),
    amendedItems: z.preprocess((val) => typeof val === 'string' ? JSON.parse(val) : val, z.array(z.any())),
});

type AmendFormState = {
    success: boolean;
    message: string;
}

export async function amendOrderAction(
    prevState: AmendFormState | undefined,
    formData: FormData,
): Promise<AmendFormState> {
    if (!db) {
        return { success: false, message: "Database not configured." };
    }

    const validatedFields = amendOrderSchema.safeParse({
        orderId: formData.get('orderId'),
        originalItems: formData.get('originalItems'),
        amendedItems: formData.get('amendedItems'),
    });

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Invalid data submitted. ' + JSON.stringify(validatedFields.error.flatten().fieldErrors),
        };
    }

    const { orderId, originalItems, amendedItems } = validatedFields.data;

    try {
        await runTransaction(db, async (transaction) => {
            const orderRef = doc(db, 'orders', orderId);
            const stockAdjustments: Map<string, number> = new Map();

            // Calculate stock adjustments
            const allItemIds = new Set([...originalItems.map(i => i.productId), ...amendedItems.map(i => i.id)]);

            for (const itemId of allItemIds) {
                const originalQty = originalItems.find(i => i.productId === itemId)?.quantity || 0;
                const amendedQty = amendedItems.find(i => i.id === itemId)?.quantity || 0;
                const diff = originalQty - amendedQty; // Positive if stock should be returned, negative if stock should be taken
                if (diff !== 0) {
                    stockAdjustments.set(itemId, diff);
                }
            }

            // Get all product docs and validate stock
            const productRefs = Array.from(stockAdjustments.keys()).map(id => doc(db, 'products', id));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));
            
            for (let i = 0; i < productDocs.length; i++) {
                const productDoc = productDocs[i];
                const productId = productRefs[i].id;
                const adjustment = stockAdjustments.get(productId)!;
                
                if (!productDoc.exists()) throw new Error(`Product with ID ${productId} not found.`);
                
                const currentStock = productDoc.data().stock;
                // If adjustment is negative, we are taking stock. Ensure enough is available.
                if (adjustment < 0 && currentStock < Math.abs(adjustment)) {
                    throw new Error(`Not enough stock for ${productDoc.data().name}. Only ${currentStock} available.`);
                }
            }

            // Apply stock updates
            for (let i = 0; i < productDocs.length; i++) {
                const productDoc = productDocs[i];
                const productId = productRefs[i].id;
                const adjustment = stockAdjustments.get(productId)!;
                const newStock = productDoc.data().stock + adjustment;
                transaction.update(productRefs[i], { stock: newStock });
            }

            // Recalculate totals and determine amendment status
            const newSubtotal = amendedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const newSst = amendedItems.reduce((sum, item) => item.hasSst ? sum + (item.price * item.quantity * SST_RATE) : sum, 0);
            const newTotal = newSubtotal + newSst;
            
            const finalItemsWithStatus: Order['items'] = amendedItems.map(amendedItem => {
                const originalItem = originalItems.find(i => i.productId === amendedItem.id);
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
                    hasSst: amendedItem.hasSst,
                    amendmentStatus: amendmentStatus,
                };
            });

            // Update the order
            transaction.update(orderRef, {
                items: finalItemsWithStatus,
                subtotal: newSubtotal,
                sst: newSst,
                total: newTotal,
                isEditable: false, // Re-lock the order after amendment
            });
        });

        return { success: true, message: 'Order updated successfully.' };

    } catch (error: any) {
        console.error("Amend order transaction failed:", error);
        return { success: false, message: error.message || "An unknown error occurred during the update." };
    }
}
