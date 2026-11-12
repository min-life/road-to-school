'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { IotDashboard } from './_components/iot-dashboard';

export default function IotPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && user && user.role !== 'SYSTEM_ADMIN') router.replace('/admin');
  }, [isLoading, user, router]);
  if (isLoading) return <p role="status">Đang kiểm tra quyền truy cập…</p>;
  if (!user || user.role !== 'SYSTEM_ADMIN') return null;
  return <IotDashboard key={user.id} />;
}
