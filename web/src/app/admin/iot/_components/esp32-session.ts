import type { ESPLoader, Transport } from 'esptool-js';
import { parseSerialReply, serialErrorMessage, validateEsp32Image } from './iot-protocol.ts';
import type { SerialReply, UsbChip } from './iot-protocol';

export class Esp32Session {
  port: SerialPort | null = null;
  private loader: ESPLoader | null = null;
  private transport: Transport | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private readTask: Promise<void> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private writeTask: Promise<void> | null = null;
  private closed = false;
  private pending = new Map<string, { resolve: (value: SerialReply) => void; reject: (error: Error) => void }>();

  async connect(): Promise<UsbChip> {
    // Keep requestPort directly in the click gesture; import the flasher afterwards.
    this.port = await navigator.serial.requestPort({ filters: [{ usbVendorId: 0x10c4 }] });
    if (this.closed) throw new Error('Kết nối đã đóng.');
    const { ESPLoader, Transport } = await import('esptool-js');
    if (this.closed) throw new Error('Kết nối đã đóng.');
    this.transport = new Transport(this.port, false);
    this.loader = new ESPLoader({ transport: this.transport, baudrate: 115200,
      terminal: { clean() {}, write() {}, writeLine() {} }, debugLogging: false });
    await this.loader.main();
    if (this.closed) throw new Error('Kết nối đã đóng.');
    if (this.loader.chip.CHIP_NAME !== 'ESP32') throw new Error('POC chỉ hỗ trợ ESP32 DevKit V1.');
    const macAddress = (await this.loader.chip.readMac(this.loader)).toUpperCase();
    return { macAddress, chipModel: await this.loader.chip.getChipDescription(this.loader),
      deviceId: `ESP32_${macAddress.replaceAll(':', '')}` };
  }

  async flash(image: Uint8Array, progress: (value: number) => void) {
    if (!this.loader || this.reader || this.closed) throw new Error('Kết nối lại ESP32 để nạp firmware.');
    validateEsp32Image(image);
    const { default: SparkMD5 } = await import('spark-md5');
    await this.loader.writeFlash({
      fileArray: [{ data: image, address: 0 }], flashSize: 'detect', flashMode: 'keep', flashFreq: 'keep',
      eraseAll: false, compress: true,
      calculateMD5Hash: data => SparkMD5.ArrayBuffer.hash(data.slice().buffer as ArrayBuffer),
      reportProgress: (_file, written, total) => progress(Math.min(99, Math.floor(written * 100 / total))),
    });
    // The flasher verifies written data; opening the console resets into the application.
    progress(100);
  }

  async openConsole(onLost: () => void): Promise<{ firmwareVersion: string; deviceId: string; configured: boolean; wifiScan: boolean; vehicleAssignment: boolean }> {
    if (!this.loader || !this.transport || !this.port || this.closed) throw new Error('Chưa kết nối ESP32.');
    await this.loader.after('hard_reset');
    await this.transport.disconnect();
    this.loader = null; this.transport = null;
    if (this.closed) throw new Error('Kết nối đã đóng.');
    await this.port.open({ baudRate: 115200 });
    await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
    this.reader = this.port.readable!.getReader();
    this.readTask = this.readLines().catch(() => { if (!this.closed) onLost(); });
    await new Promise(resolve => setTimeout(resolve, 1200));
    const reply = await this.command('INFO');
    const version = reply.data?.firmwareVersion;
    if (reply.data?.protocolVersion !== 1 || typeof version !== 'string' || !version.trim() || version.length > 80
      || typeof reply.data.deviceId !== 'string' || typeof reply.data.configured !== 'boolean') {
      throw new Error('Firmware chưa trả thông tin phiên bản hợp lệ.');
    }
    return { firmwareVersion: version, deviceId: reply.data.deviceId, configured: reply.data.configured,
      wifiScan: reply.data.wifiScan === true, vehicleAssignment: reply.data.vehicleAssignment === true };
  }

  private async readLines(): Promise<void> {
    const reader = this.reader!;
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (!this.closed) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let end: number;
        while ((end = buffer.indexOf('\n')) !== -1) {
          const reply = parseSerialReply(buffer.slice(0, end).trim());
          buffer = buffer.slice(end + 1);
          if (reply) this.pending.get(reply.requestId)?.resolve(reply);
        }
        if (buffer.length > 8192) buffer = '';
      }
    } finally {
      reader.releaseLock();
      this.reader = null;
      for (const request of this.pending.values()) request.reject(new Error('Kết nối USB đã đóng.'));
      if (!this.closed) throw new Error('Kết nối USB đã đóng.');
    }
  }

  async command(command: string, data: Record<string, unknown> = {}): Promise<SerialReply> {
    if (!this.port?.writable || !this.reader || this.closed) throw new Error('Mở Serial trước khi gửi cấu hình.');
    const requestId = crypto.randomUUID();
    let timeout: ReturnType<typeof setTimeout>;
    const response = new Promise<SerialReply>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      timeout = setTimeout(() => reject(new Error('ESP32 chưa phản hồi. Kiểm tra firmware và kết nối USB.')), 20000);
    });
    // Attach immediately so a disconnected reader cannot cause an unhandled rejection while writing.
    void response.catch(() => undefined);
    try {
      const writer = this.port.writable.getWriter();
      this.writer = writer;
      this.writeTask = writer.write(new TextEncoder().encode(JSON.stringify({ command, requestId, ...data }) + '\n'))
        .finally(() => { writer.releaseLock(); this.writer = null; this.writeTask = null; });
      await this.writeTask;
      const reply = await response;
      if (!reply.ok) throw new Error(serialErrorMessage(reply.data?.code));
      return reply;
    } finally { clearTimeout(timeout!); this.pending.delete(requestId); }
  }

  async disconnect() {
    this.closed = true;
    for (const request of this.pending.values()) request.reject(new Error('Kết nối USB đã đóng.'));
    await this.writer?.abort().catch(() => undefined);
    await this.writeTask?.catch(() => undefined);
    await this.reader?.cancel().catch(() => undefined);
    await this.readTask;
    await this.transport?.disconnect().catch(() => undefined);
    if (this.port?.readable || this.port?.writable) await this.port.close().catch(() => undefined);
    this.port = null;
  }
}
