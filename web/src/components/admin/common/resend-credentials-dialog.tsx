'use client';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { LifecycleDialog } from './lifecycle-dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/stores/toast-store';
type ResendCredentialsProps = {
  employee: { id: string; fullName: string; email: string | null };
  onClose: () => void;
} & ({ kind: 'driver'; schoolId?: never } | { kind?: 'teacher' | 'school-admin'; schoolId: string });

export function ResendCredentialsDialog(props: ResendCredentialsProps) {
  const { employee, onClose } = props;
  const roleLabel = props.kind === 'driver' ? 'tài xế' : props.kind === 'school-admin' ? 'quản trị trường' : 'giáo viên';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    if (busy || !employee.email) return;
    setBusy(true); setError('');
    try {
      const result = props.kind === 'driver'
        ? await apiClient.resendDriverCredentials(employee.id)
        : await apiClient.resendSchoolEmployeeCredentials(props.schoolId, employee.id);
      if (result.credentialDeliveryStatus === 'FAILED') { setError('Mật khẩu đã thay đổi nhưng email chưa gửi được. Cần cấp lại để bàn giao mật khẩu mới.'); return; }
      if (result.credentialDeliveryStatus === 'CONSOLE') toast.info('Đã cấp mật khẩu; thông tin bàn giao ở console phát triển.');
      else toast.success('Đã cấp lại mật khẩu và gửi email.');
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể cấp lại mật khẩu.'); }
    finally { setBusy(false); }
  }
  return <LifecycleDialog open title={`Cấp lại mật khẩu ${roleLabel}?`} busy={busy} onClose={onClose}
    footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Quay lại</Button><Button variant="primary" disabled={busy || !employee.email} onClick={() => void submit()}>{busy ? 'Đang cấp lại…' : 'Cấp lại mật khẩu'}</Button></>}>
    <div className="space-y-3 text-sm"><strong>{employee.fullName}</strong><p className="break-all">{employee.email || 'Chưa có email.'}</p><p className="lifecycle-notice">Mật khẩu hiện tại sẽ được thay thế.</p>{error && <p role="alert" className="text-rose-700">{error}</p>}</div>
  </LifecycleDialog>;
}
