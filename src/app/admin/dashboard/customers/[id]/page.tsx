
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import type { User, Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, MapPin, Phone, User as UserIcon, ArrowLeft, Hash } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function CustomerDetailsPage() {
    const params = useParams<{ id: string }>();
    const [user, setUser] = useState<User | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate fetching data
        setIsLoading(true);
        setTimeout(() => {
            const demoUser: User = {
                id: params.id,
                restaurantName: 'Demo Cafe',
                personInCharge: 'Demo User',
                email: 'demo@example.com',
                phoneNumber: '+60123456789',
                address: '123 Jalan Demo, 50000 Kuala Lumpur',
                tin: 'TIN-DEMO-456'
            };
            setUser(demoUser);
            setIsLoading(false);
        }, 500);
    }, [params.id]);

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    if (isLoading) {
        return (
            <div className="flex w-full justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return notFound();
    }

    return (
        <div className="space-y-6">
            <Button asChild variant="outline" size="sm">
                <Link href="/admin/dashboard/customers" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to All Customers
                </Link>
            </Button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader className="items-center text-center">
                            <Avatar className="h-24 w-24 mb-4 text-3xl">
                                <AvatarFallback>{getInitials(user.restaurantName)}</AvatarFallback>
                            </Avatar>
                            <CardTitle>{user.restaurantName}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                             <div className="flex items-start gap-3">
                                <UserIcon className="h-4 w-4 mt-1 text-muted-foreground" />
                                <div>
                                    <p className="font-semibold">Person in Charge</p>
                                    <p className="text-muted-foreground">{user.personInCharge || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                                <div>
                                    <p className="font-semibold">Email</p>
                                    <p className="text-muted-foreground">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                                <div>
                                    <p className="font-semibold">Phone</p>
                                    <p className="text-muted-foreground">{user.phoneNumber || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                                <div>
                                    <p className="font-semibold">Address</p>
                                    <p className="text-muted-foreground">{user.address || 'N/A'}</p>
                                </div>
                            </div>
                             {user.tin && (
                                <div className="flex items-start gap-3">
                                    <Hash className="h-4 w-4 mt-1 text-muted-foreground" />
                                    <div>
                                        <p className="font-semibold">TIN</p>
                                        <p className="text-muted-foreground">{user.tin}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>Order History</CardTitle>
                            <CardDescription>A list of all orders placed by {user.restaurantName}.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">No orders found (Firebase removed).</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
