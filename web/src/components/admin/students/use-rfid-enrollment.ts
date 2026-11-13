import { useEffect, useRef, useState } from "react";
import { iotApi } from "@/lib/iot-api";
import type { IotDevice } from "@/lib/iot-api";
import { enrollmentApi } from "@/lib/rfid-enrollment-api";
import type { RfidSession } from "@/lib/rfid-enrollment-api";
import { toast } from "@/stores/toast-store";
const message = (e: unknown) =>
  e instanceof Error ? e.message.slice(0, 240) : "Thao tác chưa hoàn tất.";
export function useRfidEnrollment(
  schoolId: string,
  studentId: string,
  onUpdated: () => void,
) {
  const [session, setSession] = useState<RfidSession | null>(null),
    [devices, setDevices] = useState<IotDevice[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [remaining, setRemaining] = useState(0),
    [feedback, setFeedback] = useState("");
  const mounted = useRef(false),
    locked = useRef(false),
    sequence = useRef(0),
    seenFeedback = useRef("");
  const completed = useRef("");
  useEffect(() => {
    let active = true;
    mounted.current = true;
    async function load() {
      try {
        const registry: IotDevice[] = [];
        for (let page = 1; page <= 100; page++) {
          const r = await iotApi.devices(page);
          registry.push(...r.data);
          if (page * r.limit >= r.total) break;
          if (page === 100) throw new Error("Danh sách thiết bị quá lớn.");
        }
        const own = await enrollmentApi.list(studentId);
        if (active) {
          setDevices(registry);
          setSession(own.data[0] ?? null);
          const first = own.data[0];
          if (first)
            setRemaining(
              Math.max(
                0,
                Math.ceil(
                  (new Date(first.expiresAt).getTime() -
                    new Date(first.serverTime).getTime()) /
                    1000,
                ),
              ),
            );
        }
      } catch (e) {
        if (active) setError(message(e));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [studentId]);
  const sessionId = session?.id;
  useEffect(() => {
    if (!sessionId) return;
    const id = sessionId;
    let active = true;
    async function poll() {
      if (locked.current || document.visibilityState !== "visible") return;
      const request = ++sequence.current;
      try {
        const s = await enrollmentApi.get(id);
        if (!active || request !== sequence.current) return;
        setSession(s);
        setError("");
        setRemaining(
          Math.max(
            0,
            Math.ceil(
              (new Date(s.expiresAt).getTime() -
                new Date(s.serverTime).getTime()) /
                1000,
            ),
          ),
        );
        const f = s.lastScanFeedback;
        if (f && `${f.scanId}/${f.code}` !== seenFeedback.current) {
          seenFeedback.current = `${f.scanId}/${f.code}`;
          setFeedback(
            f.code === "SAME_CARD"
              ? "Đây là thẻ hiện tại. Vui lòng quẹt thẻ mới."
              : f.code === "CARD_ALREADY_ASSIGNED"
                ? "Thẻ đã được đăng ký"
                : f.code === "CARD_ALREADY_CAPTURED"
                  ? "Thẻ đã được đọc. Vui lòng xác nhận."
                  : f.code === "CAPTURE_CONFLICT"
                    ? "Phiên đã đọc một thẻ khác. Hủy để chọn lại."
                    : "Phiên đã kết thúc.",
          );
        }
        if (s.state === "COMPLETED" && completed.current !== s.id) {
          completed.current = s.id;
          if (s.bindingCurrent)
            toast.success(
              s.operation === "REPLACE"
                ? "Đã đổi thẻ RFID"
                : "Đã đăng ký thẻ RFID",
            );
          onUpdated();
        }
      } catch (e) {
        if (active) setError(message(e));
      }
    }
    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [sessionId, onUpdated]);
  async function run(action: () => Promise<RfidSession>) {
    if (locked.current) return;
    locked.current = true;
    sequence.current++;
    setBusy(true);
    setActionError("");
    setFeedback("");
    try {
      const s = await action();
      if (mounted.current) {
        setSession(s);
        setRemaining(
          Math.max(
            0,
            Math.ceil(
              (new Date(s.expiresAt).getTime() -
                new Date(s.serverTime).getTime()) /
                1000,
            ),
          ),
        );
        if (s.state === "COMPLETED") {
          completed.current = s.id;
          if (s.bindingCurrent)
            toast.success(
              s.operation === "REPLACE"
                ? "Đã đổi thẻ RFID"
                : "Đã đăng ký thẻ RFID",
            );
          onUpdated();
        }
      }
      return s;
    } catch (e) {
      if (mounted.current) setActionError(message(e));
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return {
    session,
    devices,
    loading,
    busy,
    error: actionError || error,
    remaining,
    feedback,
    start: (
      deviceId: string,
      operation: "REGISTER" | "REPLACE" = "REGISTER",
      expectedPreviousCardUid?: string,
      expectedStudentVersion?: string,
    ) =>
      run(() =>
        enrollmentApi.start(
          schoolId,
          studentId,
          deviceId,
          operation,
          expectedPreviousCardUid,
          expectedStudentVersion,
        ),
      ),
    confirm: () =>
      session ? run(() => enrollmentApi.confirm(session)) : undefined,
    cancel: () =>
      session ? run(() => enrollmentApi.cancel(session.id)) : undefined,
    reconcile: () =>
      session ? run(() => enrollmentApi.reconcile(session.id)) : undefined,
  };
}
