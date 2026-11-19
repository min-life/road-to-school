import { useEffect, useRef, useState } from "react";
import { iotApi, type IotDevice } from "@/lib/iot-api";
import { parseSerialReply } from "@/lib/iot-serial-reply";

async function readDeviceInfo(port: SerialPort, signal: AbortSignal) {
  if (port.readable || port.writable)
    throw new Error("Cổng USB đang được sử dụng. Ngắt kết nối ở tab IoT rồi thử lại.");
  let opened = false;
  try {
    await port.open({ baudRate: 115200 });
    opened = true;
    signal.throwIfAborted();
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await new Promise((resolve) => setTimeout(resolve, 750));
    signal.throwIfAborted();
    const reader = port.readable!.getReader();
    const writer = port.writable!.getWriter();
    const timeout = AbortSignal.any([signal, AbortSignal.timeout(8000)]);
    const cancel = () => {
      void reader.cancel().catch(() => undefined);
      void writer.abort().catch(() => undefined);
    };
    timeout.addEventListener("abort", cancel, { once: true });
    try {
      const requestId = crypto.randomUUID();
      await writer.write(
        new TextEncoder().encode(`\n${JSON.stringify({ command: "INFO", requestId })}\n`),
      );
      const decoder = new TextDecoder();
      let buffer = "";
      while (!timeout.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let end: number;
        while ((end = buffer.indexOf("\n")) >= 0) {
          const reply = parseSerialReply(buffer.slice(0, end).trim());
          buffer = buffer.slice(end + 1);
          if (reply?.requestId !== requestId) continue;
          const id = reply.data?.deviceId;
          if (
            !reply.ok ||
            reply.data?.protocolVersion !== 1 ||
            typeof id !== "string" ||
            !/^ESP32_[A-F0-9]{12}$/.test(id)
          )
            throw new Error(
              "Không nhận diện được ESP32. Kiểm tra firmware hoặc chọn cổng khác.",
            );
          if (reply.data?.configured !== true)
            throw new Error(
              "ESP32 chưa được thiết lập. Mở trang Thiết bị IoT để cấu hình.",
            );
          return { id, firmwareVersion: reply.data.firmwareVersion };
        }
        if (buffer.length > 8192) buffer = "";
      }
      throw new Error("ESP32 chưa phản hồi. Kiểm tra cáp USB và firmware.");
    } finally {
      timeout.removeEventListener("abort", cancel);
      writer.releaseLock();
      reader.releaseLock();
    }
  } catch (error) {
    if (!opened && error instanceof DOMException && error.name === "NetworkError")
      throw new Error(
        "Không mở được cổng USB. Đóng tab IoT hoặc phần mềm đang giữ cổng rồi thử lại.",
      );
    throw error;
  } finally {
    if (opened) await port.close().catch(() => undefined);
  }
}

function supportsAssignedEnrollment(version: unknown) {
  if (typeof version !== "string") return false;
  const match = /^(\d+)\.(\d+)\.\d+(?:[-+].+)?$/.exec(version);
  return !!match && (+match[1] > 1 || (+match[1] === 1 && +match[2] >= 4));
}

type EnrollmentDevice = Pick<
  IotDevice,
  "deviceId" | "name" | "assignment" | "enrollmentBusy" | "pendingSessionId"
>;

export function useEnrollmentUsb(canReadRegistry: boolean) {
  const [device, setDevice] = useState<EnrollmentDevice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loss, setLoss] = useState<{ deviceId: string } | null>(null);
  const [requiresUpdate, setRequiresUpdate] = useState(false);
  const active = useRef<AbortController | null>(null);
  const selectedPort = useRef<SerialPort | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
      active.current = null;
      selectedPort.current = null;
    };
  }, []);

  async function choose(expectedDeviceId?: string) {
    if (busy) return;
    if (!window.isSecureContext || !navigator.serial) {
      setError("Dùng Chrome hoặc Edge trên HTTPS hoặc localhost để chọn thiết bị USB.");
      return;
    }
    setBusy(true);
    setError("");
    let controller: AbortController | undefined;
    try {
      // Call in the click handler before awaiting any other browser or network work.
      const port = await navigator.serial.requestPort({
        filters: [{ usbVendorId: 0x10c4 }, { usbVendorId: 0x1a86 }],
      });
      if (!mounted.current) return;
      active.current?.abort();
      controller = new AbortController();
      active.current = controller;
      setDevice(null);
      selectedPort.current = null;
      setRequiresUpdate(false);
      let id = "";
      const current = controller;
      port.addEventListener(
        "disconnect",
        () => {
          current.abort();
          if (active.current !== current) return;
          selectedPort.current = null;
          setDevice(null);
          if (id) setLoss({ deviceId: id });
          setError("Đã mất kết nối USB. Cắm lại ESP32 để tiếp tục.");
        },
        { once: true, signal: current.signal },
      );
      const info = await readDeviceInfo(port, current.signal);
      if (expectedDeviceId && info.id !== expectedDeviceId)
        throw new Error("Hãy chọn lại đúng ESP32 đang dùng cho phiên này.");
      // School admins identify the local reader via USB. The start endpoint
      // verifies registration without granting access to the fleet registry.
      const registered: EnrollmentDevice | undefined = canReadRegistry
        ? (await iotApi.devices({ deviceId: info.id, limit: 1 })).data[0]
        : { deviceId: info.id, name: "ESP32" };
      if (current.signal.aborted || active.current !== current) return;
      if (!registered)
        throw new Error("ESP32 chưa được đăng ký. Mở trang Thiết bị IoT để thiết lập.");
      id = info.id;
      selectedPort.current = port;
      setDevice(registered);
      setLoss(null);
      setRequiresUpdate(
        !!registered.assignment && !supportsAssignedEnrollment(info.firmwareVersion),
      );
    } catch (cause) {
      if (!mounted.current || controller?.signal.aborted) return;
      controller?.abort();
      if (!(cause instanceof DOMException && cause.name === "NotFoundError"))
        setError(
          cause instanceof Error ? cause.message : "Không chọn được thiết bị USB.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  function isConnected() {
    if (selectedPort.current && selectedPort.current.connected !== false) return true;
    if (device) setLoss({ deviceId: device.deviceId });
    setDevice(null);
    setError("Đã mất kết nối USB. Cắm lại ESP32 để tiếp tục.");
    return false;
  }

  return { device, busy, error, loss, requiresUpdate, choose, isConnected };
}
