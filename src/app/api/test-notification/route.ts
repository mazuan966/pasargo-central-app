
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { sendOrderConfirmationNotifications } from '@/lib/actions';
import type { Order } from '@/lib/types';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderId');

    if (!orderNumber) {
        return NextResponse.json({ success: false, message: "Please provide an orderId query parameter (e.g., ?orderId=PA0014090725)." }, { status: 400 });
    }

    if (!db) {
         return NextResponse.json({ success: false, message: "Firebase is not configured." }, { status: 500 });
    }

    try {
        const ordersCollection = collection(db, 'orders');
        const q = query(ordersCollection, where('orderNumber', '==', orderNumber));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return NextResponse.json({ success: false, message: `Order with orderNumber "${orderNumber}" not found.` }, { status: 404 });
        }

        const orderDoc = querySnapshot.docs[0];
        
        // We have the order, now call the notification function
        const notificationResult = await sendOrderConfirmationNotifications(orderDoc.id);

        if (notificationResult.success) {
            return NextResponse.json({ success: true, message: `Successfully triggered notifications for order ${orderNumber}. Check your WhatsApp.` });
        } else {
            throw new Error(notificationResult.message || 'Failed to send notifications.');
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error(`[Test Notification] Error for order ${orderNumber}:`, error);
        return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
    }
}
