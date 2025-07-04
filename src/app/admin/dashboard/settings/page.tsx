import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BusinessSettingsForm } from '@/components/admin/BusinessSettingsForm';

export default function AdminSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Settings</CardTitle>
        <CardDescription>
          Update your company's details. This information will appear on invoices and purchase orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BusinessSettingsForm />
      </CardContent>
    </Card>
  );
}
