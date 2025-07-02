import { AdminLoginForm } from '@/components/auth/AdminLoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons/logo';
import Link from 'next/link';

export default function AdminLoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
          <Logo className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl font-headline">Admin Login</CardTitle>
        <CardDescription>Enter admin credentials to access the dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminLoginForm />
         <p className="mt-4 text-center text-sm text-muted-foreground">
          Not an admin?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Go to User Login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
