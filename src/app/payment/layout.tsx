
import UserLayout from '@/components/layout/UserLayout';

// This is a temporary layout to bypass the main UserLayout for the payment page,
// which is now just a redirect handler. Once the user is redirected away from Toyyibpay,
// they will land on the status page which has its own simple layout.
export default function PaymentPageLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
