import React from 'react';
import { PageHeader } from '@/components/ui/page-header';

export default function AdminOverviewPage() {
  return (
    <PageHeader>
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
        Tổng quan
      </h1>
      {/* Khung nội dung chính để trống theo quyết định của Product Owner tại Wireframe W2 */}
      <PageHeader className="mt-6" />
    </PageHeader>
  );
}
