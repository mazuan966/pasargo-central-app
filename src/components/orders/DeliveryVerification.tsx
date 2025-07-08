
'use client';

import { useState, useRef, useTransition, useActionState, useEffect } from 'react';
import type { Order } from '@/lib/types';
import { verifyDeliveryAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle, XCircle, FileImage, Sparkles } from 'lucide-react';
import Image from 'next/image';

const initialState = {
  success: false,
  message: '',
};

function VerificationResult({ verification }: { verification: NonNullable<Order['deliveryVerification']> }) {
    const { isOrderCompleted, confidence, notes, verifiedAt } = verification;
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <Alert variant={isOrderCompleted ? "default" : "destructive"} className="bg-background">
            {isOrderCompleted ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            <AlertTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Verification Complete
            </AlertTitle>
            <AlertDescription>
                <div className="space-y-2 mt-2">
                    <p><strong>Status:</strong> {isOrderCompleted ? "Order Completed" : "Verification Failed"}</p>
                    <p><strong>Confidence:</strong> {(confidence * 100).toFixed(0)}%</p>
                    {notes && <p><strong>Notes:</strong> {notes}</p>}
                    <p className="text-xs text-muted-foreground pt-1">Verified at: {isMounted ? new Date(verifiedAt).toLocaleString() : ''}</p>
                </div>
            </AlertDescription>
        </Alert>
    );
}


export function DeliveryVerification({ order }: { order: Order }) {
  const [state, formAction, isPending] = useActionState(verifyDeliveryAction, initialState);
  const [preview, setPreview] = useState<string | null>(order.deliveryPhotoUrl || null);
  const photoDataUriRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        if (photoDataUriRef.current) {
          photoDataUriRef.current.value = result;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (order.deliveryVerification) {
      return <VerificationResult verification={order.deliveryVerification} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="orderDocId" value={order.id} />
      <input type="hidden" name="orderNumber" value={order.orderNumber} />
      <input type="hidden" name="photoDataUri" ref={photoDataUriRef} />

      <div className="grid gap-2">
        <Label htmlFor="delivery-photo">Upload Signed Receipt</Label>
        {preview && (
          <div className="mt-2 w-full max-w-sm aspect-video relative rounded-md overflow-hidden border">
            <Image src={preview} alt="Delivery receipt preview" fill className="object-contain" />
          </div>
        )}
        <div className="flex items-center gap-2">
            <Input id="delivery-photo" name="photoFile" type="file" accept="image/*" onChange={handleFileChange} className="max-w-xs" />
            <Button type="submit" disabled={isPending || !preview}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Verify
            </Button>
        </div>
        {!preview && 
          <div className="p-4 border-dashed border-2 rounded-md text-center text-muted-foreground">
              <FileImage className="mx-auto h-8 w-8 mb-2" />
              <p>Image preview will appear here.</p>
          </div>
        }
      </div>

      {state && !state.success && state.message && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      {state && state.success && (
        <Alert className="mt-4">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
