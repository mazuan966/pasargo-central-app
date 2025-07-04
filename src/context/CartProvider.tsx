'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { CartItem, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const SST_RATE = 0.06;

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
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

  useEffect(() => {
    // You could load cart from localStorage here if needed
  }, []);

  const addToCart = (product: Product, quantity: number) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    const newQuantityInCart = (existingItem ? existingItem.quantity : 0) + quantity;

    if (newQuantityInCart > product.stock) {
      toast({
          variant: 'destructive',
          title: 'Not enough stock!',
          description: `Cannot add ${quantity} more of ${product.name}. Only ${product.stock} available in total.`,
      });
      return; // Exit early
    }

    if (existingItem) {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      setCartItems(prevItems => [...prevItems, { ...product, quantity }]);
    }
    
    toast({
      title: 'Added to Cart',
      description: `${quantity} x ${product.name}`,
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    toast({
      title: 'Removed from Cart',
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
            title: 'Not enough stock!',
            description: `Only ${itemToUpdate.stock} of ${itemToUpdate.name} available.`,
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
