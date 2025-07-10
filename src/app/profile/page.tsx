
'use client';

import { UserProfileForm } from '@/components/profile/UserProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordChangeForm } from '@/components/profile/PasswordChangeForm';
import { useLanguage } from '@/context/LanguageProvider';

export default function ProfilePage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.title')}</CardTitle>
          <CardDescription>Firebase has been removed. This form is not functional.</CardDescription>
        </CardHeader>
        <CardContent>
          <UserProfileForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.change_password_title')}</CardTitle>
          <CardDescription>Firebase has been removed. This form is not functional.</CardDescription>
        </CardHeader>
        <CardContent>
            <PasswordChangeForm />
        </CardContent>
      </Card>
    </div>
  );
}
