
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import crypto from 'crypto-js';
import { sendOrderConfirmationNotifications } from '@/lib/actions';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        
        const billcode = formData.get('billcode') as string;
        const status = formData.get('status') as string; // 1 = success, 2 = pending, 3 = fail
        const order_id = formData.get('order_id') as string; // This is the billExternalReferenceNo, which we set to the Order Number
        const signature = formData.get('signature') as string;
        
        if (!billcode || !status || !order_id || !signature) {
             return new Response('Missing required parameters from Toyyibpay callback', { status: 400 });
        }
        
        const toyyibpaySecretKey = 'frfiveec-jeex-kegd-xgwu-ryuzyuvy9qsl';
        if (!toyyibpaySecretKey) {
            console.error('Toyyibpay secret key is not configured.');
            return new Response('Server configuration error', { status: 500 });
        }
        
        // As per Toyyibpay API documentation: sha256(secretkey + billcode + order_id + status)
        const signatureString = `${toyyibpaySecretKey}${billcode}${order_id}${status}`;
        const ourSignature = crypto.SHA256(signatureString).toString();
        
        if (signature !== ourSignature) {
            console.warn(`Invalid signature received. Got: ${signature}, Expected: ${ourSignature}. String was: "${signatureString}"`);
            return new Response('Invalid signature', { status: 400 });
        }

        const ordersCollection = collection(db, 'orders');
        const q = query(ordersCollection, where('orderNumber', '==', order_id));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn(`Order not found for orderNumber: ${order_id}`);
            return new Response('Order not found', { status: 404 });
        }
        
        const orderDoc = querySnapshot.docs[0];
        const orderRef = orderDoc.ref;
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
