'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
export default function AdminFinalizationsAlias() {
  const router = useRouter();
  const query = useSearchParams().toString();
  useEffect(() => {
    const next = new URLSearchParams(query);
    next.set('tab', 'finalizations');
    router.replace('/admin/trips?' + next.toString());
  }, [query, router]);
  return <p role="status">Đang mở chuyến cần xử lý…</p>;
}
