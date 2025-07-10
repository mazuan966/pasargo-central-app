
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BusinessSettingsForm } from '@/components/admin/BusinessSettingsForm';

export default function AdminSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Settings</CardTitle>
        <CardDescription>
          Firebase has been removed. This form is not functional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BusinessSettingsForm />
      </CardContent>
    </Card>
  );
}
