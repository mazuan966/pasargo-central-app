
'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { CartItem, Product, ProductVariant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './LanguageProvider';

const SST_RATE = 0.06;
const CART_STORAGE_KEY = 'pasargo-cart';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, selectedVariant: ProductVariant, quantity: number, silent?: boolean) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
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

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error("Failed to save cart to localStorage", error);
    }
  }, [cartItems]);


  const addToCart = (product: Product, selectedVariant: ProductVariant, quantity: number, silent: boolean = false) => {
    const cartItemId = `${product.id}_${selectedVariant.id}`;
    const existingItem = cartItems.find(item => item.id === cartItemId);
    const newQuantityInCart = (existingItem ? existingItem.quantity : 0) + quantity;

    if (newQuantityInCart > selectedVariant.stock) {
        if (!silent) {
            toast({
                variant: 'destructive',
                title: t('toast.not_enough_stock_title'),
                description: t('toast.not_enough_stock_description', { stock: selectedVariant.stock, name: `${getTranslated(product, 'name')} (${selectedVariant.name})` }),
            });
        }
        return;
    }
    
    if (!silent) {
      toast({
        title: t('toast.added_to_cart_title'),
        description: `${quantity} x ${getTranslated(product, 'name')} (${selectedVariant.name})`,
      });
    }

    setCartItems(prevItems => {
        const itemExists = prevItems.find(item => item.id === cartItemId);
        if (itemExists) {
            return prevItems.map(item =>
                item.id === cartItemId
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
            );
        } else {
            const newCartItem: CartItem = {
              id: cartItemId,
              productId: product.id,
              productName: product.name,
              productName_ms: product.name_ms,
              productName_th: product.name_th,
              description: product.description,
              description_ms: product.description_ms,
              description_th: product.description_th,
              variantId: selectedVariant.id,
              variantName: selectedVariant.name,
              quantity,
              price: selectedVariant.price,
              unit: selectedVariant.unit,
              stock: selectedVariant.stock,
              imageUrl: product.imageUrl,
              hasSst: product.hasSst,
            };
            return [...prevItems, newCartItem];
        }
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== cartItemId));
    toast({
      title: t('toast.removed_from_cart_title'),
    });
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    const itemToUpdate = cartItems.find(item => item.id === cartItemId);
    if (!itemToUpdate) return;

    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    if (quantity > itemToUpdate.stock) {
        toast({
            variant: 'destructive',
            title: t('toast.not_enough_stock_title'),
            description: t('toast.not_enough_stock_description', { stock: itemToUpdate.stock, name: `${getTranslated(itemToUpdate, 'productName')} (${itemToUpdate.variantName})` }),
        });
        setCartItems(prevItems =>
            prevItems.map(item =>
                item.id === cartItemId ? { ...item, quantity: itemToUpdate.stock } : item
            )
        );
        return;
    }
    
    setCartItems(prevItems => 
        prevItems.map(item =>
            item.id === cartItemId ? { ...item, quantity } : item
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
