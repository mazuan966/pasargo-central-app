
import { notFound } from 'next/navigation';

// This is now a Server Component
export default async function BulkPrintPOPage({ searchParams }: { searchParams: { ids?: string } }) {
    return (
        <div className="flex h-screen w-full items-center justify-center text-center p-4">
            <div>
                <h1 className="text-2xl font-bold text-destructive mb-2">Feature Disabled</h1>
                <p className="text-muted-foreground">Firebase has been removed.</p>
                <p className="text-muted-foreground mt-1">This feature requires a database connection to fetch order and business details.</p>
            </div>
        </div>
    );
}
