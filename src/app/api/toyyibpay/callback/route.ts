
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import crypto from 'crypto-js';
import { sendOrderConfirmationNotifications } from '@/lib/actions';

export async function POST(req: NextRequest) {
    try {
        console.log('[Callback] Received request from Toyyibpay.');
        const formData = await req.formData();
        
        const billcode = formData.get('billcode') as string;
        const status = formData.get('status') as string; // 1 = success, 2 = pending, 3 = fail
        const order_id = formData.get('order_id') as string; // This is the billExternalReferenceNo, which we set to the Order Number
        
        console.log(`[Callback] Data received: order_id=${order_id}, status=${status}, billcode=${billcode}`);

        if (!billcode || !status || !order_id) {
             console.error('[Callback] Missing required parameters from Toyyibpay (billcode, status, or order_id).');
             return new Response('Missing required parameters from Toyyibpay callback', { status: 400 });
        }
        
        const ordersCollection = collection(db, 'orders');
        const q = query(ordersCollection, where('orderNumber', '==', order_id));
        console.log(`[Callback] Querying for orderNumber: ${order_id}`);
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn(`[Callback] Order not found for orderNumber: ${order_id}`);
            return new Response('Order not found', { status: 404 });
        }
        
        const orderDoc = querySnapshot.docs[0];
        const orderRef = orderDoc.ref;
        const orderData = orderDoc.data() as Order;
        console.log(`[Callback] Found order with ID: ${orderDoc.id}. Current payment status: ${orderData.paymentStatus}`);
        
        if (status === '1') { // Payment success
            if (orderData.paymentStatus !== 'Paid') {
                console.log(`[Callback] Updating order ${orderData.orderNumber} to "Paid" and "Processing".`);
                const newHistory = [...orderData.statusHistory, { status: 'Processing', timestamp: new Date().toISOString() }];
                await updateDoc(orderRef, {
                    paymentStatus: 'Paid',
                    status: 'Processing',
                    statusHistory: newHistory
                });
                console.log(`[Callback] Order ${orderData.orderNumber} status updated in database.`);

                console.log(`[Callback] Triggering notifications for order ${orderData.orderNumber}...`);
                await sendOrderConfirmationNotifications(orderDoc.id);
                console.log(`[Callback] Notifications sent successfully for order ${orderData.orderNumber}.`);
            } else {
                console.log(`[Callback] Order ${orderData.orderNumber} is already marked as Paid. Skipping update.`);
            }
        } else if (status === '3') { // Payment fail
             console.log(`[Callback] Received failed payment status for order ${orderData.orderNumber}. Updating status to Failed/Cancelled.`);
             const newHistory = [...orderData.statusHistory, { status: 'Cancelled', timestamp: new Date().toISOString() }];
             await updateDoc(orderRef, {
                paymentStatus: 'Failed',
                status: 'Cancelled',
                statusHistory: newHistory
             });
        } else {
            console.log(`[Callback] Received unhandled status '${status}' for order ${orderData.orderNumber}. No action taken.`);
        }
        
        console.log('[Callback] Process finished. Returning OK to Toyyibpay.');
        return new Response('OK', { status: 200 });

    } catch (error) {
        console.error('[Callback] An unexpected error occurred:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
