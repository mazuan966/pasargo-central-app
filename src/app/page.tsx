import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Shield } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-4 mb-8">
        <Logo className="h-12 w-12 text-primary" />
        <h1 className="text-4xl font-headline font-bold text-gray-800 dark:text-white">
          Welcome to Pasargo Central
        </h1>
      </div>
      <p className="mb-12 max-w-2xl text-center text-lg text-muted-foreground">
        Your one-stop solution for supplying fresh products and groceries to restaurants and cafes across Malaysia.
      </p>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 max-w-4xl w-full">
        <Card className="transform transition-transform hover:scale-105 hover:shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <User className="h-8 w-8 text-accent" />
              <CardTitle className="text-2xl font-headline">User Portal</CardTitle>
            </div>
            <CardDescription>
              For our valued restaurant and cafe partners.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p>Access your dashboard to place new orders, track existing ones, and manage your account.</p>
            <Button asChild className="w-full mt-auto">
              <Link href="/login">User Login</Link>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              New here? <Link href="/signup" className="text-primary underline">Sign up</Link>
            </p>
          </CardContent>
        </Card>
        <Card className="transform transition-transform hover:scale-105 hover:shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Shield className="h-8 w-8 text-accent" />
              <CardTitle className="text-2xl font-headline">Admin Portal</CardTitle>
            </div>
            <CardDescription>
              For Pasargo internal staff and administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p>Manage orders, update delivery statuses, and oversee the platform's operations.</p>
            <Button asChild className="w-full mt-auto">
              <Link href="/admin/login">Admin Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}