import ItemReportForm from '@/components/report/item-report-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Report a Lost Item | Traceback',
  description: 'Fill out the form to report an item you have lost.',
};

export default function ReportLostPage() {
  return (
    <ItemReportForm
      type="lost"
      title="Report a Lost Item"
      description="Provide as much detail as possible to help us find a match. Your contact info will be shared with the person who finds your item."
    />
  );
}
