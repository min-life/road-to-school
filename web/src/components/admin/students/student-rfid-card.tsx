"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Cpu, CreditCard, Radio, Usb, X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import type { StudentDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { enrollmentApi } from "@/lib/rfid-enrollment-api";
import { toast } from "@/stores/toast-store";
import { useRfidEnrollment } from "./use-rfid-enrollment";
import { useEnrollmentUsb } from "./use-enrollment-usb";
import "./student-rfid-card.css";

type Operation = "REGISTER" | "REPLACE";
type Props = { student: StudentDetail; onUpdated: () => void };

export function StudentRfidCard({ student, onUpdated }: Props) {
  const { user } = useAuth();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [revoking, setRevoking] = useState(false);
  const isSystemAdmin = user?.role === "SYSTEM_ADMIN";
  const canRegister =
    isSystemAdmin ||
    (user?.role === "SCHOOL_ADMIN" &&
      user.schoolId === student.schoolId &&
      !student.rfidCardUid);
  return (
    <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Thẻ RFID
        </h2>
        {student.rfidCardUid ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Đã liên kết
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
            Chưa đăng ký
          </span>
        )}
      </div>

      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
        <span className="text-slate-400 block text-[11px] font-medium mb-1">Mã thẻ RFID (UID)</span>
        {student.rfidCardUid ? (
          <span className="font-mono font-bold text-slate-800 text-xs tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
            {student.rfidCardUid}
          </span>
        ) : (
          <span className="text-slate-400 italic text-xs">Chưa gán thẻ quẹt cho học sinh này</span>
        )}
      </div>

      {canRegister && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={student.status !== "AVAILABLE"}
            onClick={() =>
              setOperation(student.rfidCardUid ? "REPLACE" : "REGISTER")
            }
            className="flex-1 text-xs font-medium cursor-pointer"
          >
            {student.rfidCardUid ? "Đổi thẻ" : "Đăng ký thẻ"}
          </Button>
          {student.rfidCardUid && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={student.status !== "AVAILABLE"}
              onClick={() => setRevoking(true)}
              className="text-xs font-medium cursor-pointer"
            >
              Hủy liên kết
            </Button>
          )}
        </div>
      )}
      {operation && (
        <EnrollmentModal
          student={student}
          operation={operation}
          canReadRegistry={isSystemAdmin}
          onUpdated={onUpdated}
          onClose={() => setOperation(null)}
        />
      )}
      {revoking && (
        <RevokeModal
          student={student}
          onUpdated={onUpdated}
          onClose={() => setRevoking(false)}
        />
      )}
    </Card>
  );
}

function RevokeModal({
  student,
  onUpdated,
  onClose,
}: Props & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Freeze the exact binding displayed when the user opened the confirmation.
  const [expected] = useState({
    uid: student.rfidCardUid,
    version: student.updatedAt,
  });
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  async function revoke() {
    if (locked.current || !expected.uid) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await enrollmentApi.revoke(student.id, expected.uid, expected.version);
      toast.success("Đã hủy liên kết thẻ RFID");
      onUpdated();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message.slice(0, 240)
          : "Chưa hủy được liên kết.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="rfid-enrollment-modal"
      aria-labelledby="rfid-revoke-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <h2 id="rfid-revoke-title">Hủy liên kết thẻ · {student.fullName}</h2>
      </header>
      <div className="rfid-enroll-body" aria-busy={busy}>
        <p>Thẻ {expected.uid} sẽ không còn liên kết với học sinh này.</p>
        {error && (
          <p role="alert" className="rfid-enroll-error">
            {error}
          </p>
        )}
      </div>
      <footer>
        <Button
          autoFocus
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onClose}
        >
          Quay lại
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={busy}
          onClick={() => void revoke()}
        >
          {busy ? "Đang xử lý…" : "Hủy liên kết"}
        </Button>
      </footer>
    </dialog>
  );
}

function EnrollmentModal({
  student,
  operation,
  onUpdated,
  onClose,
  canReadRegistry,
}: Props & { operation: Operation; onClose: () => void; canReadRegistry: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const handledLoss = useRef<{ deviceId: string } | null>(null);
  const [expected] = useState({
    uid: student.rfidCardUid,
    version: student.updatedAt,
  });
  const r = useRfidEnrollment(student.schoolId, student.id, onUpdated);
  const { cancelIfWaiting } = r;
  const usb = useEnrollmentUsb(canReadRegistry);
  const s = r.session;
  const pending = s?.state === "COMMITTING" || s?.state === "RECONCILING";
  const live = !!s?.isOpen && !pending && r.remaining > 0;
  const replacing =
    (s?.isOpen || s?.state === "COMPLETED" ? s.operation : operation) === "REPLACE";
  const completed = s?.state === "COMPLETED";
  const cardUid = live ? s?.candidate?.cardUid : undefined;
  const selected = usb.device;
  const canStart =
    !live &&
    !pending &&
    !completed &&
    (operation === "REPLACE" ? !!expected.uid : !student.rfidCardUid);
  const alreadyBusy = !!selected?.enrollmentBusy && selected.pendingSessionId !== s?.id;
  const vehicleBusy = r.actionCode === "VEHICLE_ENROLLMENT_BUSY";
  const sameDevice = selected?.deviceId === s?.deviceId;
  const acknowledged =
    !!s?.lastDeviceAckAt &&
    Date.parse(s.serverTime) - Date.parse(s.lastDeviceAckAt) <= 60_000;
  const ready = live && sameDevice && acknowledged;
  const deviceLabel = s ? "ESP32 · …" + s.deviceId.slice(-4) : "";
  const countdown =
    Math.floor(r.remaining / 60) + ":" + String(r.remaining % 60).padStart(2, "0");
  const step = pending || completed || cardUid ? 2 : live ? 1 : 0;

  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);

  useEffect(() => {
    if (
      !live ||
      !s ||
      cardUid ||
      r.busy ||
      !usb.loss ||
      handledLoss.current === usb.loss ||
      usb.loss.deviceId !== s.deviceId
    )
      return;
    handledLoss.current = usb.loss;
    void cancelIfWaiting(s.id);
  }, [live, s, cardUid, r.busy, cancelIfWaiting, usb.loss]);

  async function cancel() {
    if (
      !window.confirm(
        replacing
          ? "Hủy phiên đổi thẻ? Thẻ hiện tại vẫn được giữ."
          : "Hủy phiên đăng ký đang mở?",
      )
    )
      return false;
    return !!(await r.cancel());
  }

  async function close() {
    if (r.busy || usb.busy) return;
    if (live && !(await cancel())) return;
    onClose();
  }

  return (
    <dialog
      ref={dialog}
      className="rfid-enrollment-modal rfid-usb-modal"
      aria-labelledby="rfid-enroll-title"
      onCancel={(event) => {
        event.preventDefault();
        void close();
      }}
    >
      <header>
        <div>
          <h2 id="rfid-enroll-title">
            {replacing ? "Đổi thẻ RFID" : "Đăng ký thẻ RFID"}
          </h2>
          <p className="rfid-usb-subtitle">Học sinh · {student.fullName}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Đóng"
          disabled={r.busy || usb.busy}
          onClick={() => void close()}
        >
          <X size={20} aria-hidden="true" />
        </Button>
      </header>
      <div className="rfid-enroll-body" aria-busy={r.loading || r.busy || usb.busy}>
        <ol className="rfid-usb-steps" aria-label="Các bước đăng ký thẻ">
          {["Thiết bị", "Quẹt thẻ", "Xác nhận"].map((label, index) => (
            <li key={label} aria-current={step === index ? "step" : undefined}>
              <span
                className="rfid-usb-step"
                data-complete={index < step}
                aria-hidden="true"
              >
                {index < step ? <Check size={14} /> : index + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>

        {r.error && (
          <p role="alert" className="rfid-enroll-error">
            {r.error}
          </p>
        )}
        {usb.error && !cardUid && !completed && !pending && (
          <p role="status" className="rfid-enroll-message">
            {usb.error}
          </p>
        )}
        {r.feedback && (
          <p role="status" className="rfid-enroll-message">
            {r.feedback}
          </p>
        )}
        {s?.closeReason === "VEHICLE_ENROLLMENT_BUSY" && !live && (
          <p role="status" className="rfid-enroll-message">
            Phiên đã kết thúc vì xe cần thiết bị để phục vụ chuyến.
          </p>
        )}
        {s?.state === "EXPIRED" && (
          <p role="status" className="rfid-enroll-message">
            Phiên đã hết hạn. Bạn có thể mở phiên mới.
          </p>
        )}
        {s?.state === "FAILED" && canStart && (
          <p role="status" className="rfid-enroll-message">
            Phiên trước chưa lưu được thẻ. Bạn có thể mở phiên mới.
          </p>
        )}
        {replacing && (s?.expectedPreviousCardUid || expected.uid) && !completed && (
          <p className="rfid-usb-subtitle">
            Thẻ hiện tại · {s?.expectedPreviousCardUid || expected.uid}
          </p>
        )}

        {r.loading ? (
          <p className="rfid-usb-panel" role="status">
            Đang tải phiên…
          </p>
        ) : pending || completed || (s?.state === "FAILED" && !canStart) ? (
          <div className="rfid-usb-panel" role="status">
            <div className="rfid-usb-panel-icon">
              <CreditCard size={21} aria-hidden="true" />
            </div>
            <div>
              <h3>
                {pending
                  ? "Đang kiểm tra kết quả"
                  : completed
                    ? s.bindingCurrent
                      ? replacing
                        ? "Đã đổi thẻ"
                        : "Đã đăng ký thẻ"
                      : "Liên kết thẻ hiện tại đã thay đổi"
                    : "Phiên chưa hoàn tất"}
              </h3>
              {pending && (
                <p>Phiên đang được đối soát. Kiểm tra kết quả trước khi mở phiên khác.</p>
              )}
            </div>
          </div>
        ) : cardUid ? (
          <div className="rfid-usb-panel">
            <div className="rfid-usb-panel-icon rfid-usb-panel-icon-ready">
              <CreditCard size={21} aria-hidden="true" />
            </div>
            <div>
              <h3>{replacing ? "Thẻ mới" : "Thẻ vừa quẹt"}</h3>
              <p className="rfid-usb-uid">{cardUid}</p>
              <p>Kiểm tra mã thẻ trước khi lưu vào hồ sơ.</p>
            </div>
          </div>
        ) : live ? (
          <div className="rfid-usb-panel">
            <div
              className={
                ready
                  ? "rfid-usb-panel-icon rfid-usb-panel-icon-ready"
                  : "rfid-usb-panel-icon"
              }
            >
              <Radio size={21} aria-hidden="true" />
            </div>
            <div className="rfid-usb-panel-main">
              <div className="rfid-usb-panel-heading">
                <h3 role="status">
                  {ready
                    ? "Đưa thẻ lên đầu đọc"
                    : sameDevice
                      ? "Đang chờ thiết bị nhận phiên"
                      : "Kết nối lại ESP32"}
                </h3>
                <span
                  className="rfid-usb-badge"
                  aria-label={"Thời gian còn lại " + countdown}
                >
                  {countdown}
                </span>
              </div>
              <p>{deviceLabel}</p>
              {sameDevice ? (
                <p>
                  {ready
                    ? "Giữ kết nối USB cho đến khi đọc xong thẻ."
                    : "Nếu chưa nhận phiên, kiểm tra Wi-Fi của ESP32."}
                </p>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={usb.busy || r.busy}
                  onClick={() => void usb.choose(s.deviceId)}
                >
                  {usb.busy ? "Đang nhận diện…" : "Chọn lại ESP32 qua USB"}
                </Button>
              )}
            </div>
          </div>
        ) : canStart ? (
          <div className="rfid-usb-panel">
            <div className="rfid-usb-panel-icon">
              {selected ? (
                <Cpu size={21} aria-hidden="true" />
              ) : (
                <Usb size={21} aria-hidden="true" />
              )}
            </div>
            <div className="rfid-usb-panel-main">
              <div className="rfid-usb-panel-heading">
                <h3>
                  {selected
                    ? selected.name + " · …" + selected.deviceId.slice(-4)
                    : "Kết nối ESP32 với máy này"}
                </h3>
                {selected && <span className="rfid-usb-badge">Đã kết nối USB</span>}
              </div>
              {selected ? (
                <>
                  {canReadRegistry && <p>
                    {selected.assignment
                      ? "Đang gắn xe " + selected.assignment.licensePlate
                      : "Chưa gắn xe"}
                  </p>}
                  {alreadyBusy && (
                    <p role="status">Thiết bị đang có phiên đăng ký khác.</p>
                  )}
                  {usb.requiresUpdate && (
                    <p role="status">Cần firmware từ 1.4.0 để dùng thiết bị đã gắn xe.</p>
                  )}
                </>
              ) : (
                <p>Cắm cáp USB, sau đó chọn thiết bị trong trình duyệt.</p>
              )}
              <Button
                type="button"
                variant={selected ? "ghost" : "outline"}
                disabled={usb.busy || r.busy}
                onClick={() => {
                  r.clearActionError();
                  void usb.choose();
                }}
              >
                {usb.busy
                  ? "Đang nhận diện…"
                  : selected
                    ? "Đổi thiết bị"
                    : "Chọn ESP32 qua USB"}
              </Button>
            </div>
          </div>
        ) : (
          <p role="status" className="rfid-usb-panel">
            Hồ sơ đã thay đổi. Mở lại để tiếp tục.
          </p>
        )}
      </div>
      <footer>
        {!live && (
          <Button
            type="button"
            variant="outline"
            disabled={r.busy || usb.busy}
            onClick={() => void close()}
          >
            {pending || completed ? "Đóng" : "Hủy"}
          </Button>
        )}
        {pending && (
          <Button
            type="button"
            variant="primary"
            disabled={r.busy}
            onClick={() => void r.reconcile()}
          >
            Kiểm tra kết quả
          </Button>
        )}
        {live && (
          <Button
            type="button"
            variant="outline"
            disabled={r.busy || usb.busy}
            onClick={() => void cancel()}
          >
            Hủy phiên
          </Button>
        )}
        {cardUid && (
          <Button
            type="button"
            variant="primary"
            disabled={r.busy || usb.busy}
            onClick={() => void r.confirm()}
          >
            {replacing ? "Xác nhận đổi thẻ" : "Xác nhận đăng ký"}
          </Button>
        )}
        {canStart && (
          <Button
            type="button"
            variant="primary"
            disabled={
              r.loading ||
              r.busy ||
              usb.busy ||
              !selected ||
              alreadyBusy ||
              usb.requiresUpdate
            }
            onClick={() => {
              if (selected && usb.isConnected())
                void r.start(
                  selected.deviceId,
                  operation,
                  expected.uid || undefined,
                  expected.version,
                );
            }}
          >
            {vehicleBusy ? "Thử lại" : "Mở phiên"}
          </Button>
        )}
      </footer>
    </dialog>
  );
}
