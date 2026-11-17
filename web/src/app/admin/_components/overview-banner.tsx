import { PageHeader } from '@/components/ui/page-header';

export function OverviewBanner({ schoolName }: { schoolName?: string | null }) {
  return (
    <PageHeader
      title="Tổng quan"
      actions={
        schoolName ? (
          <span className="text-sm font-medium text-slate-500" title={schoolName}>
            {schoolName}
          </span>
        ) : undefined
      }
    />
  );
}
