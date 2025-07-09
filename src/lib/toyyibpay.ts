
'use server';

import type { Order, User } from '@/lib/types';

const TOYYIBPAY_SECRET_KEY = 'dev-08d4hwdk-97w7-g29f-z7bd-c87z6yhdve0f';
const TOYYIBPAY_CATEGORY_CODE = 'nqbwnp0t';
const APP_URL = 'https://studio--pasargo-central.us-central1.hosted.app';
const TOYYIBPAY_API_URL = 'https://dev.toyyibpay.com';

export async function createToyyibpayBill(order: Order, user: User): Promise<{ billCode: string; paymentUrl: string }> {

    if (!TOYYIBPAY_SECRET_KEY || !TOYYIBPAY_CATEGORY_CODE || !APP_URL) {
        throw new Error("Toyyibpay credentials or App URL are not configured on the server.");
    }

    const billAmount = Math.round(order.total * 100); // Amount in cents

    const billParams = new URLSearchParams({
        'userSecretKey': TOYYIBPAY_SECRET_KEY,
        'categoryCode': TOYYIBPAY_CATEGORY_CODE,
        'billName': `Order ${order.orderNumber}`,
        'billDescription': `Payment for Order #${order.orderNumber} from ${user.restaurantName}`,
        'billPriceSetting': '1', // 1 = Fixed Price
        'billPayorInfo': '1', // 1 = Required
        'billAmount': String(billAmount),
        'billReturnUrl': `${APP_URL}/payment/status`,
        'billCallbackUrl': `${APP_URL}/api/toyyibpay/callback`,
        'billExternalReferenceNo': order.id, // Use Firestore document ID for easy lookup
        'billTo': user.personInCharge || user.restaurantName,
        'billEmail': user.email,
        'billPhone': user.phoneNumber || '0123456789'
    });
    
    try {
        const response = await fetch(`${TOYYIBPAY_API_URL}/index.php/api/createBill`, {
            method: 'POST',
            body: billParams,
        });

        const result = await response.json();
        
        if (response.ok && result && result[0] && result[0].BillCode) {
            const billCode = result[0].BillCode;
            return {
                billCode,
                paymentUrl: `${TOYYIBPAY_API_URL}/${billCode}`
            };
        } else {
            throw new Error(`Toyyibpay API Error: ${JSON.stringify(result)}`);
        }
    } catch (error) {
        console.error("Failed to create Toyyibpay bill:", error);
        throw new Error("Could not connect to the payment gateway. Please try again later.");
    }
}
