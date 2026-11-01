'use client';

import { useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { ApprovalReadinessResponse, RoutePlanItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { toast } from '@/stores/toast-store';

export function SchoolRoutePlanApproval({ plan, readiness, failed, onRefresh, onApproved }: {
  plan: RoutePlanItem;
  readiness: ApprovalReadinessResponse | null;
  failed: boolean;
  onRefresh: () => void;
  onApproved: (plan: RoutePlanItem) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = readiness?.routePlanId === plan.id && readiness.status === 'DRAFT' && readiness.isReadyForApproval;

  const approve = async () => {
    if (!ready || busyRef.current) return;
    busyRef.current = true;
    setApproving(true);
    setError(null);
    try {
      const updated = await apiClient.approveRoutePlan(plan.id);
      dialogRef.current?.close();
      onApproved(updated);
      toast.success('Đã duyệt phương án tuyến.');
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Không thể duyệt phương án.');
      onRefresh();
    } finally {
      busyRef.current = false;
      setApproving(false);
    }
  };

  return <>
    <div className="school-plan-readiness" role="status" aria-live="polite">
      <strong>{failed ? 'Chưa tải được điều kiện duyệt' : !readiness ? 'Đang kiểm tra điều kiện duyệt…' : ready ? 'Đủ điều kiện duyệt' : 'Chưa đủ điều kiện duyệt'}</strong>
      {!!readiness?.blockers.length && <details>
        <summary>{readiness.blockers.length} mục cần xử lý</summary>
        <ul>{readiness.blockers.map((item, index) => <li key={`${item.code}:${index}`}>{item.message}</li>)}</ul>
      </details>}
    </div>
    <div className="route-workspace-actions">
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={approving}>Kiểm tra lại</Button>
      <Button variant="primary" size="sm" disabled={!ready || failed || approving}
        onClick={() => { setError(null); dialogRef.current?.showModal(); }}>Duyệt phương án</Button>
    </div>
    <dialog ref={dialogRef} className="school-plan-approval-dialog" aria-labelledby="school-plan-approval-title"
      onCancel={event => { if (busyRef.current) event.preventDefault(); }}>
      <h2 id="school-plan-approval-title">Duyệt phương án?</h2>
      <p>{plan.name}</p>
      <p>Phương án chuyển sang Đã duyệt. Phân công hiện tại dùng làm mặc định cho các chuyến được tạo sau.</p>
      {error && <p role="alert" className="saved-plan-error">{error}</p>}
      <div className="route-workspace-actions">
        <Button variant="outline" onClick={() => dialogRef.current?.close()} disabled={approving}>Quay lại</Button>
        <Button variant="primary" onClick={approve} disabled={approving || !ready || failed}>
          {approving ? 'Đang duyệt…' : 'Xác nhận duyệt'}
        </Button>
      </div>
    </dialog>
  </>;
}
