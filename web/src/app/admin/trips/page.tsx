'use client';
import { BusIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

import React, { useState } from 'react';
import { TripsTable } from '@/components/admin/trips/trips-table';
import { ManualGenerateTripsModal } from '@/components/admin/trips/manual-generate-trips-modal';
import { useAuth } from '@/components/auth/auth-provider';

import { PageHeader } from '@/components/ui/page-header';

export default function AdminTripsPage() {
  const { user } = useAuth();
  const currentUserRole = user?.role || null;
  const currentUserSchoolId = user?.role === 'SCHOOL_ADMIN' ? user.schoolId || undefined : undefined;
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);


  return (
    <div className="ui-list-page">
      {/* Page Header */}
      <PageHeader title="Chuyến xe" actions={currentUserRole === 'SYSTEM_ADMIN' && <Button type="button" variant="primary" onClick={() => setIsManualModalOpen(true)}><BusIcon className="w-4 h-4" aria-hidden="true" />Sinh chuyến thủ công</Button>} />

      {/* Trips Table */}
      <TripsTable
        refreshKey={refreshKey}
        fixedSchoolId={currentUserSchoolId}
        currentUserRole={currentUserRole}
      />

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
