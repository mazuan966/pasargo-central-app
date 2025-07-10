
'use client';

import { useState, useEffect } from 'react';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function AdminCustomersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setDbError("Firebase is not configured. Cannot fetch customers.");
      setIsLoading(false);
      return;
    }

    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, orderBy('restaurantName'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as User[];
      setUsers(usersData);
      setIsLoading(false);
      setDbError(null);
    }, (error) => {
      console.error("Error fetching customers:", error);
      setDbError("Could not fetch customers from the database.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
      <Card>
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Customers</CardTitle>
            <CardDescription>View and manage all registered restaurant and cafe partners.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dbError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                       <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Database Error</AlertTitle>
                          <AlertDescription>{dbError}</AlertDescription>
                       </Alert>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No customers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarFallback>{getInitials(user.restaurantName)}</AvatarFallback>
                            </Avatar>
                            <span>{user.restaurantName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.personInCharge}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phoneNumber}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/dashboard/customers/${user.id}`}>
                                View
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
  );
}
