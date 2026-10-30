'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { BusIcon, CloseIcon, InfoIcon, RouteIcon, SpinnerIcon } from '@/components/icons';
import './save-route-plan-dialog.css';

interface Props {
  isOpen: boolean;
  outboundCount: number;
  returnCount: number;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function SaveRoutePlanDialog({ isOpen, outboundCount, returnCount, isSaving, error, onClose, onConfirm }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement;
    dialog.showModal();
    cancelRef.current?.focus();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [isOpen]);

  const close = () => {
    if (!isSaving && !submittingRef.current) onClose();
  };

  return (
    <dialog ref={dialogRef} className="save-route-dialog" aria-labelledby="save-route-title" aria-describedby="save-route-description"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
      }}>
      <header className="save-route-dialog-header">
        <span className="save-route-dialog-icon" aria-hidden="true"><RouteIcon className="w-6 h-6" /></span>
        <div className="save-route-dialog-heading">
          <h2 id="save-route-title">Lưu phương án nháp?</h2>
          <p>Xác nhận lưu phương án tuyến đưa đón</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Đóng" disabled={isSaving} onClick={close}><CloseIcon className="w-4 h-4" /></Button>
      </header>
      <div className="save-route-dialog-body" aria-busy={isSaving}>
        <div className="save-route-dialog-summary">
          <div className="save-route-dialog-route">
            <span className="save-route-dialog-bus" aria-hidden="true"><BusIcon className="w-6 h-6" /></span>
            <div><span>Tuyến đi</span><strong>{String(outboundCount).padStart(2, '0')} tuyến</strong></div>
          </div>
          <div className="save-route-dialog-route save-route-dialog-route-return">
            <span className="save-route-dialog-bus" aria-hidden="true"><BusIcon className="w-6 h-6" /></span>
            <div><span>Tuyến về</span><strong>{String(returnCount).padStart(2, '0')} tuyến</strong></div>
          </div>
        </div>
        <div className="save-route-dialog-notice">
          <InfoIcon className="w-5 h-5" aria-hidden="true" />
          <p id="save-route-description">Các tuyến được lưu trong cùng một phương án. Nếu hủy, toàn bộ tuyến sẽ được hủy cùng lúc.</p>
        </div>
        {error && <p className="save-route-dialog-error" role="alert">{error}</p>}
      </div>
      <footer className="save-route-dialog-footer">
        <Button ref={cancelRef} variant="outline" disabled={isSaving} onClick={close}>Tiếp tục chỉnh sửa</Button>
        <Button variant="primary" disabled={isSaving} onClick={async () => {
          if (submittingRef.current || isSaving) return;
          submittingRef.current = true;
          try { await onConfirm(); } finally { submittingRef.current = false; }
        }}>
          {isSaving && <SpinnerIcon className="w-4 h-4 animate-spin" />}
          {isSaving ? 'Đang lưu…' : 'Lưu bản nháp'}
        </Button>
      </footer>
    </dialog>
  );
}
