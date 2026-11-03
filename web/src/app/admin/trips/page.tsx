'use client';
import { BusIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

import React, { useState } from 'react';
import { TripsTable } from '@/components/admin/trips/trips-table';
import { ManualGenerateTripsModal } from '@/components/admin/trips/manual-generate-trips-modal';
import { useAuth } from '@/components/auth/auth-provider';

import { PageHeader } from '@/components/ui/page-header';
import { AdminFinalizationsPanel } from './_components/admin-finalizations-panel';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export default function AdminTripsPage() {
  const { user } = useAuth();
  const currentUserRole = user?.role || null;
  const currentUserSchoolId = user?.role === 'SCHOOL_ADMIN' ? user.schoolId || undefined : undefined;
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const query = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const finalizationsOpen = currentUserRole === 'SYSTEM_ADMIN' && query.get('tab') === 'finalizations';
  const selectTab = (tab: string) => { const next = new URLSearchParams(query.toString()); next.set('tab', tab); router.replace(`${pathname}?${next}`, { scroll: false }); };


  return (
    <div className="ui-list-page">
      {/* Page Header */}
      <PageHeader title="Chuyến xe" actions={currentUserRole === 'SYSTEM_ADMIN' && <Button type="button" variant="primary" onClick={() => setIsManualModalOpen(true)}><BusIcon className="w-4 h-4" aria-hidden="true" />Sinh chuyến thủ công</Button>} />

      {/* Trips Table */}
      {currentUserRole === 'SYSTEM_ADMIN' && <div className="flex flex-wrap gap-2"><Button type="button" variant={!finalizationsOpen ? 'primary' : 'outline'} onClick={() => selectTab('trips')}>Danh sách chuyến</Button><Button type="button" variant={finalizationsOpen ? 'primary' : 'outline'} onClick={() => selectTab('finalizations')}>Cần xử lý hành chính</Button></div>}
      {finalizationsOpen ? <AdminFinalizationsPanel onUpdated={() => setRefreshKey(value => value + 1)} /> :
      <TripsTable
        refreshKey={refreshKey}
        fixedSchoolId={currentUserSchoolId}
        currentUserRole={currentUserRole}
      />}

      {/* Manual Generation Modal (System Admin only) */}
      <ManualGenerateTripsModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={() => {
          setRefreshKey((k) => k + 1);
        }}
        initialSchoolId={currentUserSchoolId}
      />
    </div>
  );
}
