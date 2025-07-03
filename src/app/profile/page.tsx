'use client';

import { UserProfileForm } from '@/components/profile/UserProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordChangeForm } from '@/components/profile/PasswordChangeForm';
import { Separator } from '@/components/ui/separator';

export default function ProfilePage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>Update your account and restaurant details here.</CardDescription>
        </CardHeader>
        <CardContent>
          <UserProfileForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Leave these fields blank to keep your current password.</CardDescription>
        </CardHeader>
        <CardContent>
            <PasswordChangeForm />
        </CardContent>
      </Card>
    </div>
  );
}
