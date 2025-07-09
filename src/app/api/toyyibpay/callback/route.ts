
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Order } from '@/lib/types';

// This callback is now a failsafe backup only. It does NOT send notifications to prevent duplicates.
// The primary logic is handled by `confirmFpxPaymentAction` triggered from the user's redirect.
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const status = formData.get('status') as string; // 1 = success, 2 = pending, 3 = fail
        const order_id = formData.get('order_id') as string; // This is the Firestore Doc ID
        
        if (!status || !order_id) {
             console.log('[Callback] Received request with missing parameters.');
             return new Response('OK', { status: 200 }); // Return OK to Toyyibpay
        }

        if (status === '1') {
            const orderRef = doc(db, 'orders', order_id);
            const orderDoc = await getDoc(orderRef);

            if (orderDoc.exists()) {
                const orderData = orderDoc.data() as Order;
                if (orderData.paymentStatus !== 'Paid') {
                     const newHistory = [...orderData.statusHistory, { status: 'Processing', timestamp: new Date().toISOString() }];
                     await updateDoc(orderRef, {
                         paymentStatus: 'Paid',
                         status: 'Processing',
                         statusHistory: newHistory
                     });
                     console.log(`[Callback Backup] Order ${orderData.orderNumber} successfully marked as Paid.`);
                }
            }
        }
        
        // Always return OK to Toyyibpay to acknowledge receipt of the callback.
        return new Response('OK', { status: 200 });

    } catch (error) {
        console.error('Toyyibpay callback backup error:', error);
        return new Response('OK', { status: 200 }); // Still return OK to prevent Toyyibpay retries
    }
}
