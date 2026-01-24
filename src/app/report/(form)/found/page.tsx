import ItemReportForm from '@/components/report/item-report-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Report a Found Item | Traceback',
  description: 'Fill out the form to report an item you have found.',
};

export default function ReportFoundPage() {
  return (
    <ItemReportForm
      type="found"
      title="Report a Found Item"
      description="Thank you for helping someone reconnect with their belongings. Your contact info will be visible to the person looking for this item."
    />
  );
}
