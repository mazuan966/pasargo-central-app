
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import crypto from 'crypto-js';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { format } from 'date-fns';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        
        const billcode = formData.get('billcode') as string;
        const status = formData.get('status') as string; // 1 = success, 2 = pending, 3 = fail
        const order_id = formData.get('order_id') as string; // This is the Firestore document ID
        const signature = formData.get('signature') as string;
        
        if (!billcode || !status || !order_id || !signature) {
             return new Response('Missing required parameters', { status: 400 });
        }
        
        const toyyibpaySecretKey = process.env.TOYYIBPAY_SECRET_KEY || 'dev-08d4hwdk-97w7-g29f-z7bd-c87z6yhdve0f';
        if (!toyyibpaySecretKey) {
            console.error('Toyyibpay secret key is not configured.');
            return new Response('Server configuration error', { status: 500 });
        }
        
        // Toyyibpay signature for callback is sha256(secretkey + billcode + order_id + status)
        const signatureString = `${toyyibpaySecretKey}${billcode}${order_id}${status}`;
        const ourSignature = crypto.SHA256(signatureString).toString();
        
        if (signature !== ourSignature) {
            console.warn(`Invalid signature received. Got: ${signature}, Expected: ${ourSignature}. String was: "${signatureString}"`);
            return new Response('Invalid signature', { status: 400 });
        }

        const orderRef = doc(db, 'orders', order_id);
        const orderDoc = await getDoc(orderRef);
        
        if (!orderDoc.exists()) {
            console.warn(`Order not found for ID: ${order_id}`);
            return new Response('Order not found', { status: 404 });
        }

        const orderData = orderDoc.data() as Order;
        
        if (status === '1') { // Payment success
            if (orderData.paymentStatus !== 'Paid') {
                const newHistory = [...orderData.statusHistory, { status: 'Processing', timestamp: new Date().toISOString() }];
                await updateDoc(orderRef, {
                    paymentStatus: 'Paid',
                    status: 'Processing',
                    statusHistory: newHistory
                });
                console.log(`Order ${orderData.orderNumber} marked as Paid.`);

                // Send notifications now that payment is confirmed
                const { user, orderNumber, items, subtotal, sst, total, deliveryDate, deliveryTimeSlot, id: orderDocId } = { ...orderData, id: orderDoc.id };
                const testPhoneNumber = '60163864181';
                const appUrl = 'https://studio--pasargo-central.us-central1.hosted.app';
                let invoiceMessageSection = appUrl ? `\n\nHere is the unique link to view your invoice:\n${appUrl}/print/invoice/${orderDocId}` : '';
                let poMessageSection = appUrl ? `\n\nHere is the unique link to view the Purchase Order:\n${appUrl}/admin/print/po/${orderDocId}` : '';
                const userInvoiceMessage = `Hi ${user.restaurantName}!\n\nThank you for your order!\n\n*Invoice for Order #${orderNumber}*\n\n` + `*Delivery Date:* ${format(new Date(deliveryDate), 'dd/MM/yyyy')}\n` + `*Delivery Time:* ${deliveryTimeSlot}\n\n` + items.map(item => `- ${item.name} (${item.quantity} x RM ${item.price.toFixed(2)})`).join('\n') + `\n\nSubtotal: RM ${subtotal.toFixed(2)}\nSST (6%): RM ${sst.toFixed(2)}\n*Total: RM ${total.toFixed(2)}*` + `${invoiceMessageSection}\n\n`+ `We will process your order shortly.`;
                await sendWhatsAppMessage(testPhoneNumber, userInvoiceMessage);
                const adminPOMessage = `*New Purchase Order Received*\n\n` + `*Order ID:* ${orderNumber}\n` + `*From:* ${user.restaurantName}\n` + `*Total:* RM ${total.toFixed(2)}*\n\n` + `*Delivery:* ${format(new Date(deliveryDate), 'dd/MM/yyyy')} (${deliveryTimeSlot})\n\n` + `*Items:*\n` + items.map(item => `- ${item.name} (x${item.quantity})`).join('\n') + `${poMessageSection}\n\n` + `Please process the order in the admin dashboard.`;
                await sendWhatsAppMessage(testPhoneNumber, `[ADMIN PO] ${adminPOMessage}`);
            }
        } else {
             await updateDoc(orderRef, {
                paymentStatus: 'Failed',
                status: 'Cancelled',
             });
            console.log(`Received non-successful payment status '${status}' for order ${orderData.orderNumber}. Marked as Failed/Cancelled.`);
        }
        
        return new Response('OK', { status: 200 });

    } catch (error) {
        console.error('Toyyibpay callback error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
