"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import type { StudentDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { enrollmentApi } from "@/lib/rfid-enrollment-api";
import { toast } from "@/stores/toast-store";
import { useRfidEnrollment } from "./use-rfid-enrollment";
import "./student-rfid-card.css";

type Operation = "REGISTER" | "REPLACE";
type Props = { student: StudentDetail; onUpdated: () => void };

export function StudentRfidCard({ student, onUpdated }: Props) {
  const { user } = useAuth();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [revoking, setRevoking] = useState(false);
  return (
    <Card className="rfid-student-card">
      <h2>Thẻ RFID</h2>
      <p>{student.rfidCardUid || "Chưa đăng ký"}</p>
      {user?.role === "SYSTEM_ADMIN" && (
        <div className="rfid-student-actions">
          <Button
            type="button"
            variant="outline"
            disabled={student.status !== "AVAILABLE"}
            onClick={() =>
              setOperation(student.rfidCardUid ? "REPLACE" : "REGISTER")
            }
          >
            {student.rfidCardUid ? "Đổi thẻ" : "Đăng ký thẻ"}
          </Button>
          {student.rfidCardUid && (
            <Button
              type="button"
              variant="danger"
              disabled={student.status !== "AVAILABLE"}
              onClick={() => setRevoking(true)}
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
}: Props & { operation: Operation; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [deviceId, setDeviceId] = useState("");
  const [expected] = useState({
    uid: student.rfidCardUid,
    version: student.updatedAt,
  });
  const r = useRfidEnrollment(student.schoolId, student.id, onUpdated),
    s = r.session;
  const pending = s?.state === "COMMITTING" || s?.state === "RECONCILING";
  const live = !!s?.isOpen && !pending && r.remaining > 0;
  const replacing = (s?.isOpen ? s.operation : operation) === "REPLACE";
  const completed = s?.state === "COMPLETED";
  const canStart =
    !live &&
    !pending &&
    !completed &&
    (operation === "REPLACE" ? !!expected.uid : !student.rfidCardUid);
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  async function close() {
    if (r.busy) return;
    if (pending) {
      onClose();
      return;
    }
    if (live) {
      if (
        !window.confirm(
          replacing
            ? "Hủy phiên đổi thẻ? Thẻ hiện tại vẫn được giữ."
            : "Hủy phiên đăng ký đang mở?",
        )
      )
        return;
      if (!(await r.cancel())) return;
    }
    onClose();
  }
  return (
    <dialog
      ref={dialog}
      className="rfid-enrollment-modal"
      aria-labelledby="rfid-enroll-title"
      onCancel={(e) => {
        e.preventDefault();
        void close();
      }}
    >
      <header>
        <h2 id="rfid-enroll-title">
          {replacing ? "Đổi thẻ" : "Đăng ký thẻ"} · {student.fullName}
        </h2>
        <Button
          type="button"
          variant="ghost"
          disabled={r.busy}
          onClick={() => void close()}
        >
          Đóng
        </Button>
      </header>
      <div className="rfid-enroll-body" aria-busy={r.loading || r.busy}>
        {r.error && (
          <p role="alert" className="rfid-enroll-error">
            {r.error}
          </p>
        )}
        {r.feedback && (
          <p role="status" className="rfid-enroll-message">
            {r.feedback}
          </p>
        )}
        {replacing && (
          <p>Thẻ hiện tại: {s?.expectedPreviousCardUid || expected.uid}</p>
        )}
        {r.loading ? (
          <p role="status">Đang tải phiên và thiết bị…</p>
        ) : (
          <>
            {canStart && (
              <label htmlFor="rfid-enroll-device">
                ESP32 chưa gắn xe
                <Select
                  id="rfid-enroll-device"
                  value={deviceId}
                  disabled={r.busy}
                  onChange={(e) => setDeviceId(e.target.value)}
                >
                  <option value="">Chọn thiết bị</option>
                  {r.devices.map((d) => (
                    <option
                      key={d.deviceId}
                      value={d.deviceId}
                      disabled={!!d.assignment || !!d.enrollmentBusy}
                    >
                      {d.name} · {d.deviceId}
                      {d.assignment
                        ? ` · Xe ${d.assignment.licensePlate}`
                        : d.enrollmentBusy
                          ? " · Đang đăng ký"
                          : " · Chưa gắn xe"}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            {s && (
              <>
                <p role="status">
                  {pending
                    ? "Đang đối soát"
                    : completed
                      ? s.bindingCurrent
                        ? s.operation === "REPLACE"
                          ? "Đã đổi thẻ"
                          : "Thẻ đã được đăng ký"
                        : "Phiên đã hoàn tất; liên kết thẻ hiện tại đã thay đổi"
                      : live
                        ? s.candidate
                          ? "Đã đọc thẻ. Xác nhận để lưu."
                          : s.lastDeviceAckAt
                            ? "Chờ quẹt thẻ"
                            : "Chờ thiết bị nhận phiên"
                        : "Phiên đã kết thúc hoặc hết hạn"}
                </p>
                <p>Thiết bị: {s.deviceId}</p>
                {live && (
                  <p>
                    Còn {Math.floor(r.remaining / 60)}:
                    {String(r.remaining % 60).padStart(2, "0")}
                  </p>
                )}
                <label htmlFor="rfid-enroll-uid">
                  {replacing ? "Thẻ mới" : "Thẻ vừa đọc"}
                  <Input
                    id="rfid-enroll-uid"
                    readOnly
                    value={s.candidate?.cardUid || ""}
                    placeholder="Chưa đọc thẻ"
                  />
                </label>
              </>
            )}
          </>
        )}
      </div>
      <footer>
        {pending ? (
          <Button
            type="button"
            variant="primary"
            disabled={r.busy}
            onClick={() => void r.reconcile()}
          >
            Kiểm tra kết quả
          </Button>
        ) : live ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={r.busy}
              onClick={() => {
                if (
                  window.confirm(
                    replacing
                      ? "Hủy phiên đổi thẻ? Thẻ hiện tại vẫn được giữ."
                      : "Hủy phiên? Học sinh sẽ chưa được gán thẻ.",
                  )
                )
                  void r.cancel();
              }}
            >
              Hủy phiên
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={r.busy || r.loading || !s?.candidate}
              onClick={() => void r.confirm()}
            >
              {replacing ? "Xác nhận đổi thẻ" : "Xác nhận đăng ký"}
            </Button>
          </>
        ) : (
          canStart && (
            <Button
              type="button"
              variant="primary"
              disabled={r.busy || r.loading || !deviceId}
              onClick={() =>
                void r.start(
                  deviceId,
                  operation,
                  expected.uid || undefined,
                  expected.version,
                )
              }
            >
              Mở phiên
            </Button>
          )
        )}
      </footer>
    </dialog>
  );
}
