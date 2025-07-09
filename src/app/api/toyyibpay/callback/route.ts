
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { sendOrderConfirmationNotifications } from '@/lib/actions';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        
        const status = formData.get('status') as string; // 1 = success, 2 = pending, 3 = fail
        const order_id = formData.get('order_id') as string; // This is the billExternalReferenceNo, which we set to the Firestore Doc ID
        
        if (!status || !order_id) {
             console.error('[Callback] Missing required parameters from Toyyibpay (status or order_id).');
             return new Response('Missing required parameters from Toyyibpay callback', { status: 400 });
        }
        
        const orderRef = doc(db, 'orders', order_id);
        const orderDoc = await getDoc(orderRef);

        if (!orderDoc.exists()) {
            console.warn(`[Callback] Order not found for ID: ${order_id}`);
            return new Response('Order not found', { status: 404 });
        }
        
        const orderData = orderDoc.data() as Order;
        
        if (status === '1') { // Payment success
            // Prevent duplicate processing if callback is sent multiple times
            if (orderData.paymentStatus !== 'Paid') {
                const newHistory = [...orderData.statusHistory, { status: 'Processing', timestamp: new Date().toISOString() }];
                await updateDoc(orderRef, {
                    paymentStatus: 'Paid',
                    status: 'Processing',
                    statusHistory: newHistory
                });
                console.log(`[Callback] Order ${orderData.orderNumber} marked as Paid.`);

                // Trigger notifications now that the order is confirmed and paid.
                await sendOrderConfirmationNotifications(orderDoc.id);
                console.log(`[Callback] Notifications sent for order ${orderData.orderNumber}.`);
            }
        } else if (status === '3') { // Payment fail
             const newHistory = [...orderData.statusHistory, { status: 'Cancelled', timestamp: new Date().toISOString() }];
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
