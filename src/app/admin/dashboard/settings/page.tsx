
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BusinessSettingsForm } from '@/components/admin/BusinessSettingsForm';

export default function AdminSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Settings</CardTitle>
        <CardDescription>
          Manage your business details for use in invoices and purchase orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BusinessSettingsForm />
      </CardContent>
    </Card>
  );
}
