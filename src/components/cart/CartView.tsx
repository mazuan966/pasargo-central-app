
'use client';

import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import CartItem from './CartItem';
import { ShoppingCart, Package } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageProvider';

export default function CartView() {
  const { cartItems, cartSubtotal, cartSst, cartTotal, clearCart } = useCart();
  const { t } = useLanguage();

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-semibold">{t('cart.empty_title')}</h2>
        <p className="mt-2 text-muted-foreground">{t('cart.empty_subtitle')}</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">{t('cart.start_shopping')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('cart.your_items')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {cartItems.map(item => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>{t('cart.summary_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>{t('cart.subtotal')}</span>
              <span>RM {cartSubtotal.toFixed(2)}</span>
            </div>
             <div className="flex justify-between">
              <span>{t('cart.sst')}</span>
              <span>RM {cartSst.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>{t('cart.total')}</span>
              <span>RM {cartTotal.toFixed(2)}</span>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/checkout">
                <Package className="mr-2 h-4 w-4" />
                {t('cart.checkout_button')}
              </Link>
            </Button>
            <Button variant="outline" className="w-full" onClick={clearCart}>
              {t('cart.clear_button')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
