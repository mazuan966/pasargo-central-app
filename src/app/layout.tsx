import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { CartProvider } from '@/context/CartProvider';
import { OrderProvider } from '@/context/OrderProvider';
import { AuthProvider } from '@/context/AuthProvider';

export const metadata: Metadata = {
  title: 'Pasargo Central',
  description: 'One centralised app for restaurants and cafes to order fresh products and groceries.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <OrderProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </OrderProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
