
import { UserLoginForm } from '@/components/auth/UserLoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons/logo';
import Link from 'next/link';

export default function UserLoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
          <Logo className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl font-headline">Login</CardTitle>
        <CardDescription>Firebase has been removed. This form is not functional.</CardDescription>
      </CardHeader>
      <CardContent>
        <UserLoginForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
