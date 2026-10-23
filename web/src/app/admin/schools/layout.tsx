'use client';

import React from 'react';
import { AdminSchoolsGuard } from '@/components/admin/schools/admin-schools-guard';

export default function AdminSchoolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminSchoolsGuard>{children}</AdminSchoolsGuard>;
}
