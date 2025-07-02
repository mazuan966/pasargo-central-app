import type { Product, Order } from './types';

export const mockProducts: Product[] = [
  { id: 'prod-001', name: 'Fresh Tomatoes', description: 'Locally sourced ripe tomatoes.', price: 5.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Vegetables', stock: 100, 'data-ai-hint': 'fresh tomatoes' },
  { id: 'prod-002', name: 'Organic Spinach', description: 'Fresh organic spinach leaves.', price: 7.20, imageUrl: 'https://placehold.co/600x400.png', category: 'Vegetables', stock: 80, 'data-ai-hint': 'organic spinach' },
  { id: 'prod-003', name: 'Red Apples', description: 'Crisp and sweet red apples.', price: 4.80, imageUrl: 'https://placehold.co/600x400.png', category: 'Fruits', stock: 120, 'data-ai-hint': 'red apples' },
  { id: 'prod-004', name: 'Whole Chicken', description: 'Farm-raised whole chicken.', price: 25.00, imageUrl: 'https://placehold.co/600x400.png', category: 'Meat', stock: 30, 'data-ai-hint': 'raw chicken' },
  { id: 'prod-005', name: 'Basmati Rice', description: 'Premium long-grain basmati rice (5kg).', price: 35.00, imageUrl: 'https://placehold.co/600x400.png', category: 'Groceries', stock: 50, 'data-ai-hint': 'basmati rice' },
  { id: 'prod-006', name: 'Olive Oil', description: 'Extra virgin olive oil (1L).', price: 42.00, imageUrl: 'https://placehold.co/600x400.png', category: 'Groceries', stock: 60, 'data-ai-hint': 'olive oil' },
  { id: 'prod-007', name: 'Cheddar Cheese', description: 'Aged cheddar cheese block (250g).', price: 15.00, imageUrl: 'https://placehold.co/600x400.png', category: 'Dairy', stock: 75, 'data-ai-hint': 'cheddar cheese' },
  { id: 'prod-008', name: 'Fresh Milk', description: 'Full cream milk (1L).', price: 6.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Dairy', stock: 90, 'data-ai-hint': 'milk carton' },
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-1001',
    user: { id: 'user-01', restaurantName: 'The Daily Grind Cafe' },
    items: [
      { productId: 'prod-001', name: 'Fresh Tomatoes', quantity: 5, price: 5.50 },
      { productId: 'prod-002', name: 'Organic Spinach', quantity: 3, price: 7.20 },
    ],
    total: 49.10,
    status: 'Delivered',
    orderDate: '2024-07-28T09:30:00Z',
    deliveryDate: '2024-07-28T14:00:00Z',
    paymentMethod: 'Cash on Delivery',
    paymentStatus: 'Paid',
    statusHistory: [
        { status: 'Pending', timestamp: '2024-07-28T09:30:00Z' },
        { status: 'Processing', timestamp: '2024-07-28T10:00:00Z' },
        { status: 'Out for Delivery', timestamp: '2024-07-28T12:00:00Z' },
        { status: 'Delivered', timestamp: '2024-07-28T14:00:00Z' },
    ],
    deliveryVerification: {
        isOrderCompleted: true,
        confidence: 0.95,
        notes: "Signature is clear, all items appear to be present.",
        verifiedAt: "2024-07-28T14:05:00Z",
    }
  },
  {
    id: 'ORD-1002',
    user: { id: 'user-02', restaurantName: 'Spice Route Restaurant' },
    items: [
      { productId: 'prod-004', name: 'Whole Chicken', quantity: 10, price: 25.00 },
      { productId: 'prod-005', name: 'Basmati Rice', quantity: 2, price: 35.00 },
    ],
    total: 320.00,
    status: 'Out for Delivery',
    orderDate: '2024-07-29T04:55:00Z',
    paymentMethod: 'Bank Transfer',
    paymentStatus: 'Paid',
    paymentProofUrl: 'https://placehold.co/600x400.png',
    statusHistory: [
        { status: 'Pending', timestamp: '2024-07-29T04:55:00Z' },
        { status: 'Processing', timestamp: '2024-07-29T06:00:00Z' },
        { status: 'Out for Delivery', timestamp: '2024-07-29T08:30:00Z' },
    ]
  },
  {
    id: 'ORD-1003',
    user: { id: 'user-01', restaurantName: 'The Daily Grind Cafe' },
    items: [
      { productId: 'prod-008', name: 'Fresh Milk', quantity: 12, price: 6.50 },
    ],
    total: 78.00,
    status: 'Processing',
    orderDate: '2024-07-30T03:00:00Z',
    paymentMethod: 'Cash on Delivery',
    paymentStatus: 'Unpaid',
    statusHistory: [
        { status: 'Pending', timestamp: '2024-07-30T03:00:00Z' },
        { status: 'Processing', timestamp: '2024-07-30T04:00:00Z' },
    ]
  }
];
