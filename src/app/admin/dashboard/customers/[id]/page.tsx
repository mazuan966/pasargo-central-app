'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import type { User, Order } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
        if (!params.id) return;

        const fetchCustomerData = async () => {
            setIsLoading(true);
            if (!db) {
                console.error("Firebase not initialized");
                setIsLoading(false);
                return;
            }
            try {
                // Fetch user details
                const userDocRef = doc(db, 'users', params.id as string);
                const userDoc = await getDoc(userDocRef);

                if (!userDoc.exists()) {
                    notFound();
                    return;
                }
                const userData = { id: userDoc.id, ...userDoc.data() } as User;
                setUser(userData);

                // Fetch user's orders - removed orderBy to avoid needing a composite index
                const ordersQuery = query(
                    collection(db, 'orders'),
                    where('user.id', '==', params.id)
                );
                const ordersSnapshot = await getDocs(ordersQuery);
                const ordersList = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
                // Sort on the client side instead
                ordersList.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
                setOrders(ordersList);

            } catch (error) {
                console.error("Error fetching customer data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCustomerData();
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
                                    {orders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">No orders found.</TableCell>
                                        </TableRow>
                                    ) : (
                                        orders.map(order => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                                                <TableCell>{format(new Date(order.orderDate), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                                <TableCell className="text-right">RM {order.total.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button asChild variant="ghost" size="sm">
                                                        <Link href={`/admin/dashboard/orders/${order.id}`}>View</Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
