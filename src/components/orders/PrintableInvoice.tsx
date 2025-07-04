import type { Order, BusinessDetails } from '@/lib/types';
import { Logo } from '@/components/icons/logo';

export const PrintableInvoice = ({ order, businessDetails }: { order: Order, businessDetails: BusinessDetails }) => {
  return (
    <div className="bg-white text-black p-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <Logo className="h-12 w-12 text-gray-800" />
          <h1 className="font-bold text-2xl mt-2">{businessDetails.name}</h1>
          <p className="text-sm whitespace-pre-line">{businessDetails.address}</p>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-bold uppercase text-gray-700">Invoice</h2>
          <p className="text-sm mt-2">Invoice #: {order.orderNumber}</p>
          <p className="text-sm">Date: {new Date(order.orderDate).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8">
        <h3 className="font-bold border-b pb-1 mb-2">Bill To</h3>
        <p className="font-semibold">{order.user.restaurantName}</p>
        <p className="text-sm">{order.user.address}</p>
        {order.user.tin && <p className="text-sm">TIN: {order.user.tin}</p>}
        <div className="mt-2 pt-2 border-t">
            <p className="text-sm"><span className="font-semibold">Delivery Date:</span> {new Date(order.deliveryDate).toLocaleDateString()}</p>
            <p className="text-sm"><span className="font-semibold">Time Slot:</span> {order.deliveryTimeSlot}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-left mb-8">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 font-bold">Item Description</th>
            <th className="p-2 font-bold text-right">Quantity</th>
            <th className="p-2 font-bold text-right">Unit Price / Unit</th>
            <th className="p-2 font-bold text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map(item => (
            <tr key={item.productId} className="border-b">
              <td className="p-2">{item.name}</td>
              <td className="p-2 text-right">{item.quantity}</td>
              <td className="p-2 text-right">RM {item.price.toFixed(2)} / {item.unit || 'item'}</td>
              <td className="p-2 text-right">RM {(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div className="flex justify-end mb-8">
        <div className="w-full max-w-xs space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold">Subtotal</span>
            <span>RM {order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">SST (6%)</span>
            <span>RM {order.sst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t-2 border-black">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-lg">RM {order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center text-sm text-gray-600 border-t pt-4">
        <p>Thank you for your business!</p>
        <p>{businessDetails.name} | {businessDetails.email}</p>
      </div>
    </div>
  );
};
