
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import crypto from 'crypto-js';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

const appUrl = 'https://studio--pasargo-central.us-central1.hosted.app';

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
        
        // Corrected signature generation. Toyyibpay usually expects the secret key to be prepended.
        const toyyibpaySignatureString = `${toyyibpaySecretKey}${billcode}${order_id}${status}`;
        const ourSignature = crypto.SHA256(toyyibpaySignatureString).toString();
        
        if (signature !== ourSignature) {
            console.warn(`Invalid signature received from Toyyibpay. Got: ${signature}, Expected: ${ourSignature}`);
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
            if (orderData.paymentStatus !== 'Paid') {
                const newHistory = [...orderData.statusHistory, { status: 'Processing', timestamp: new Date().toISOString() }];
                await updateDoc(orderRef, {
                    paymentStatus: 'Paid',
                    status: 'Processing',
                    statusHistory: newHistory
                });
                console.log(`Order ${order_id} marked as Paid.`);

                // Send notifications now that payment is confirmed
                const { user, orderNumber, items, subtotal, sst, total, deliveryDate, deliveryTimeSlot, id: orderDocId } = { ...orderData, id: orderDoc.id };
                const testPhoneNumber = '60163864181';
                
                let invoiceMessageSection = appUrl ? `\n\nHere is the unique link to view your invoice:\n${appUrl}/print/invoice/${orderDocId}` : '';
                let poMessageSection = appUrl ? `\n\nHere is the unique link to view the Purchase Order:\n${appUrl}/admin/print/po/${orderDocId}` : '';
                
                const userInvoiceMessage = `Hi ${user.restaurantName}!\n\nThank you for your order!\n\n*Invoice for Order #${orderNumber}*\n\n` + `*Delivery Date:* ${new Date(deliveryDate).toLocaleDateString()}\n` + `*Delivery Time:* ${deliveryTimeSlot}\n\n` + items.map(item => `- ${item.name} (${item.quantity} x RM ${item.price.toFixed(2)})`).join('\n') + `\n\nSubtotal: RM ${subtotal.toFixed(2)}\nSST (6%): RM ${sst.toFixed(2)}\n*Total: RM ${total.toFixed(2)}*` + `${invoiceMessageSection}\n\n`+ `We will process your order shortly.`;
                await sendWhatsAppMessage(testPhoneNumber, userInvoiceMessage);
                
                const adminPOMessage = `*New Purchase Order Received*\n\n` + `*Order ID:* ${orderNumber}\n` + `*From:* ${user.restaurantName}\n` + `*Total:* RM ${total.toFixed(2)}*\n\n` + `*Delivery:* ${new Date(deliveryDate).toLocaleDateString()} (${deliveryTimeSlot})\n\n` + `*Items:*\n` + items.map(item => `- ${item.name} (x${item.quantity})`).join('\n') + `${poMessageSection}\n\n` + `Please process the order in the admin dashboard.`;
                await sendWhatsAppMessage(testPhoneNumber, `[ADMIN PO] ${adminPOMessage}`);
            }
        } else {
             await updateDoc(orderRef, {
                paymentStatus: 'Failed',
                status: 'Cancelled',
             });
            console.log(`Received non-successful payment status '${status}' for order ${order_id}. Marked as Failed/Cancelled.`);
        }
        
        return new Response('OK', { status: 200 });

    } catch (error) {
        console.error('Toyyibpay callback error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
