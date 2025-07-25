'use client';

import { useContext } from 'react';
import { OrderContext } from '@/context/OrderProvider';

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
