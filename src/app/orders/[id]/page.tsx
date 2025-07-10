
'use client';

import { notFound, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="flex w-full justify-center p-8">
        <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p>Loading order details for order #{params.id}...</p>
            <p className="text-muted-foreground">(Firebase has been removed, this is placeholder content)</p>
        </div>
    </div>
  );
}
