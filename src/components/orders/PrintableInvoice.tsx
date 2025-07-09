
import type { Order, BusinessDetails } from '@/lib/types';
import { Logo } from '@/components/icons/logo';
import { format } from 'date-fns';

type PrintableInvoiceProps = {
  order: Order;
  businessDetails: BusinessDetails;
  t: (key: string) => string;
  getTranslated: (item: any, field: string) => string;
};

export const PrintableInvoice = ({ order, businessDetails, t, getTranslated }: PrintableInvoiceProps) => {
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
          <h2 className="text-4xl font-bold uppercase text-gray-700">{t('invoice.title')}</h2>
          <p className="text-sm mt-2">{t('invoice.number')} {order.orderNumber}</p>
          <p className="text-sm">{t('invoice.date')}: {format(new Date(order.orderDate), 'dd/MM/yyyy')}</p>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8">
        <h3 className="font-bold border-b pb-1 mb-2">{t('invoice.bill_to')}</h3>
        <p className="font-semibold">{order.user.restaurantName}</p>
        <p className="text-sm">{order.user.address}</p>
        {order.user.tin && <p className="text-sm">TIN: {order.user.tin}</p>}
        <div className="mt-2 pt-2 border-t">
            <p className="text-sm"><span className="font-semibold">{t('invoice.delivery_date')}:</span> {format(new Date(order.deliveryDate), 'dd/MM/yyyy')}</p>
            <p className="text-sm"><span className="font-semibold">{t('invoice.time_slot')}:</span> {order.deliveryTimeSlot}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-left mb-8">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 font-bold">{t('invoice.item_description')}</th>
            <th className="p-2 font-bold text-right">{t('invoice.quantity')}</th>
            <th className="p-2 font-bold text-right">{t('invoice.unit_price')}</th>
            <th className="p-2 font-bold text-right">{t('invoice.total_price')}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={`${item.productId}-${item.variantId}-${index}`} className="border-b">
              <td className="p-2">{getTranslated(item, 'name')} ({item.variantName})</td>
              <td className="p-2 text-right">{item.quantity}</td>
              <td className="p-2 text-right">RM {item.price.toFixed(2)}</td>
              <td className="p-2 text-right">RM {(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div className="flex justify-end mb-8">
        <div className="w-full max-w-xs space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold">{t('invoice.subtotal')}</span>
            <span>RM {order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">{t('invoice.sst')}</span>
            <span>RM {order.sst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t-2 border-black">
            <span className="font-bold text-lg">{t('invoice.total')}</span>
            <span className="font-bold text-lg">RM {order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center text-sm text-gray-600 border-t pt-4">
        <p>{t('invoice.thank_you')}</p>
        <p>{businessDetails.name} | {businessDetails.email}</p>
      </div>
    </div>
  );
};
