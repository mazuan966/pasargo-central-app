
'use client';

import CartView from '@/components/cart/CartView';
import { useLanguage } from '@/context/LanguageProvider';

export default function CartPage() {
  const { t } = useLanguage();
  return (
    <div>
      <div className="flex items-center mb-6">
        <h1 className="text-3xl font-headline font-bold">{t('cart.title')}</h1>
      </div>
      <CartView />
    </div>
  );
}
