
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { sendOrderConfirmationNotifications } from '@/lib/actions';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        
        const status = formData.get('status') as string; // 1 = success, 2 = pending, 3 = fail
        const billcode = formData.get('billcode') as string;
        
        if (!status || !billcode) {
             console.warn('[Callback] Received request with missing status or billcode.');
             // Return OK to Toyyibpay to prevent retries.
             return new Response('OK', { status: 200 }); 
        }

        const ordersCollection = collection(db, 'orders');
        // Use the unique billcode to find the order. This is the most reliable method.
        const q = query(ordersCollection, where('toyyibpayBillCode', '==', billcode));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn(`[Callback] Order not found for billcode: ${billcode}`);
            return new Response('Order not found', { status: 404 });
        }
        
        const orderDoc = querySnapshot.docs[0];
        const orderRef = orderDoc.ref;
        const orderData = orderDoc.data() as Order;
        
        if (status === '1') { // Payment success
            // Prevent duplicate processing if callback is sent multiple times
            if (orderData.paymentStatus !== 'Paid') {
                const newHistory = [...orderData.statusHistory, { status: 'Processing' as const, timestamp: new Date().toISOString() }];
                await updateDoc(orderRef, {
                    paymentStatus: 'Paid',
                    status: 'Processing',
                    statusHistory: newHistory
                });
                console.log(`[Callback] Order ${orderData.orderNumber} (Bill: ${billcode}) successfully marked as Paid.`);

                // Trigger notifications now that the order is confirmed and paid.
                await sendOrderConfirmationNotifications(orderDoc.id);
                console.log(`[Callback] Notifications sent for order ${orderData.orderNumber}.`);
            } else {
                console.log(`[Callback] Order ${orderData.orderNumber} (Bill: ${billcode}) was already marked as Paid. Skipping duplicate processing.`);
            }
        } else if (status === '3') { // Payment fail
             const newHistory = [...orderData.statusHistory, { status: 'Cancelled' as const, timestamp: new Date().toISOString() }];
             await updateDoc(orderRef, {
                paymentStatus: 'Failed',
                status: 'Cancelled',
                statusHistory: newHistory
             });
            console.log(`[Callback] Received failed payment status for order ${orderData.orderNumber}. Marked as Failed/Cancelled.`);
        }
        
        // Always return OK to Toyyibpay to acknowledge receipt of the callback.
        return new Response('OK', { status: 200 });

    } catch (error) {
        console.error('Toyyibpay callback error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
