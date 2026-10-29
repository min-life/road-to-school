'use client';
import { BusIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

import React, { useState } from 'react';
import { TripsTable } from '@/components/admin/trips/trips-table';
import { ManualGenerateTripsModal } from '@/components/admin/trips/manual-generate-trips-modal';
import { useAuth } from '@/components/auth/auth-provider';

interface SchoolTripsTabProps {
  schoolId: string;
  schoolName: string;
}

export function SchoolTripsTab({ schoolId, schoolName }: SchoolTripsTabProps) {
  const { user } = useAuth();
  const currentUserRole = user?.role || null;
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Lịch trình chuyến xe của trường: {schoolName}
          </h3>
          <p className="text-xs text-slate-500">
            Danh sách các chuyến xe đã được lập lịch và chuyến dự kiến thuộc các phương án tuyến ACTIVE của trường
          </p>
        </div>
        {currentUserRole === 'SYSTEM_ADMIN' && <Button type="button" variant="primary" onClick={() => setIsManualModalOpen(true)}><BusIcon className="w-4 h-4" aria-hidden="true" />Sinh chuyến thủ công</Button>}
      </div>

      <TripsTable
        refreshKey={refreshKey}
        fixedSchoolId={schoolId}
        currentUserRole={currentUserRole}
      />

      {currentUserRole === 'SYSTEM_ADMIN' && (
        <ManualGenerateTripsModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
          initialSchoolId={schoolId}
          initialSchoolName={schoolName}
        />
      )}
    </div>
  );
}
