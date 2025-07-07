import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import crypto from 'crypto-js';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        
        const billcode = formData.get('billcode') as string;
        const status = formData.get('status') as string; // 1 = success, 2 = pending, 3 = fail
        const order_id = formData.get('order_id') as string; // This is our orderNumber
        const msg = formData.get('msg') as string;
        const transaction_id = formData.get('transaction_id') as string;
        const signature = formData.get('signature') as string;
        
        if (!billcode || !status || !order_id) {
             return new Response('Missing required parameters', { status: 400 });
        }
        
        const toyyibpaySecretKey = process.env.TOYYIBPAY_SECRET_KEY;
        if (!toyyibpaySecretKey) {
            console.error('Toyyibpay secret key is not configured.');
            return new Response('Server configuration error', { status: 500 });
        }
        
        // The signature as defined by Toyyibpay documentation is a SHA256 hash.
        // However, many older integrations and examples use MD5. Let's stick to their defined examples which often use MD5.
        // Let's create the hash string they expect:
        const toyyibpaySignatureString = `${billcode}${order_id}${status}`;
        const ourSignature = crypto.MD5(toyyibpaySignatureString + toyyibpaySecretKey).toString();

        // Let's also check for SHA256 as a fallback, as their docs can be inconsistent
        const ourSignatureSha256 = crypto.SHA256(toyyibpaySignatureString + toyyibpaySecretKey).toString();
        
        if (signature !== ourSignature && signature !== ourSignatureSha256) {
            console.warn('Invalid signature received from Toyyibpay');
            return new Response('Invalid signature', { status: 400 });
        }

        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('orderNumber', '==', order_id));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.warn(`Order not found for orderNumber: ${order_id}`);
            return new Response('Order not found', { status: 404 });
        }

        const orderDoc = querySnapshot.docs[0];
        const orderData = orderDoc.data() as Order;
        const orderRef = doc(db, 'orders', orderDoc.id);

        if (status === '1') { // Payment success
            // Only update if the status is not already 'Paid' to prevent duplicate processing
            if (orderData.paymentStatus !== 'Paid') {
                const newHistory = [...orderData.statusHistory, { status: 'Processing', timestamp: new Date().toISOString() }];
                await updateDoc(orderRef, {
                    paymentStatus: 'Paid',
                    status: 'Processing',
                    statusHistory: newHistory
                });
                console.log(`Order ${order_id} marked as Paid.`);
            }
        } else {
            // For other statuses (pending, fail), we can log them but might not update the order state.
            console.log(`Received non-successful payment status '${status}' for order ${order_id}.`);
        }
        
        // Respond to Toyyibpay that we have received the callback.
        return new Response('OK', { status: 200 });

    } catch (error) {
        console.error('Toyyibpay callback error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
