
'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { CartItem, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './LanguageProvider';

const SST_RATE = 0.06;
const CART_STORAGE_KEY = 'pasargo-cart';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number, silent?: boolean) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  cartSst: number;
  cartTotal: number;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { toast } = useToast();
  const { t, getTranslated } = useLanguage();

  // Load cart from localStorage on initial client-side render.
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (storedCart) {
        setCartItems(JSON.parse(storedCart));
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage", error);
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  // Save cart to localStorage whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error("Failed to save cart to localStorage", error);
    }
  }, [cartItems]);


  const addToCart = (product: Product, quantity: number, silent: boolean = false) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    const newQuantityInCart = (existingItem ? existingItem.quantity : 0) + quantity;

    if (newQuantityInCart > product.stock) {
        if (!silent) {
            toast({
                variant: 'destructive',
                title: t('toast.not_enough_stock_title'),
                description: t('toast.not_enough_stock_description', { stock: product.stock, name: getTranslated(product, 'name') }),
            });
        }
        return; // Exit without changing state
    }
    
    if (!silent) {
      toast({
        title: t('toast.added_to_cart_title'),
        description: `${quantity} x ${getTranslated(product, 'name')}`,
      });
    }

    setCartItems(prevItems => {
        const itemExists = prevItems.find(item => item.id === product.id);
        if (itemExists) {
            return prevItems.map(item =>
                item.id === product.id
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
            );
        } else {
            return [...prevItems, { ...product, quantity }];
        }
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    toast({
      title: t('toast.removed_from_cart_title'),
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const itemToUpdate = cartItems.find(item => item.id === productId);

    if (itemToUpdate && quantity > itemToUpdate.stock) {
        toast({
            variant: 'destructive',
            title: t('toast.not_enough_stock_title'),
            description: t('toast.not_enough_stock_description', { stock: itemToUpdate.stock, name: getTranslated(itemToUpdate, 'name') }),
        });
        // Revert quantity to max available stock
        setCartItems(prevItems =>
            prevItems.map(item =>
                item.id === productId ? { ...item, quantity: itemToUpdate.stock } : item
            )
        );
        return;
    }
    
    setCartItems(prevItems => 
        prevItems.map(item =>
            item.id === productId ? { ...item, quantity } : item
        )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  const cartSst = cartItems.reduce((sum, item) => {
    if (item.hasSst) {
      return sum + (item.price * item.quantity * SST_RATE);
    }
    return sum;
  }, 0);

  const cartTotal = cartSubtotal + cartSst;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
        cartSst,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
