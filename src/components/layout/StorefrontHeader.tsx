
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import { ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/use-cart';
import React from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';

export function StorefrontHeader() {
  const { cartCount } = useCart();
  
  // To avoid hydration mismatch, we only render the badge on the client.
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
      <nav className="flex w-full items-center gap-5">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold"
        >
          <Logo className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline-block text-lg font-bold">Pasargo Central</span>
        </Link>
      </nav>
      <div className="flex items-center gap-2 md:gap-4">
        <Button asChild variant="ghost" size="icon" className="relative">
            <Link href="/cart">
                <ShoppingCart className="h-5 w-5" />
                {isMounted && cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full p-0">
                    {cartCount}
                </Badge>
                )}
                <span className="sr-only">Shopping Cart</span>
            </Link>
        </Button>
        {isMounted && <LanguageSwitcher />}
        <Button asChild>
          <Link href="/login">Login / Sign Up</Link>
        </Button>
      </div>
    </header>
  );
}
