import { useState } from 'react';
import { Eye, EyeOff, RefreshCw, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { Esp32Controls } from './use-esp32';

export function WifiPanel({ controls: usb }: { controls: Esp32Controls }) {
  const [apiUrl, setApiUrl] = useState('');
  const [ssid, setSsid] = useState('');
  const [manual, setManual] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [save, setSave] = useState(false);
  const disabled = Boolean(usb.busy) || usb.mode !== 'console';
  const selected = usb.networks.find(network => network.ssid === ssid);
  const canConnect = usb.provisioned && (manual || selected?.supported === true);
  const scanMessage = usb.scanStatus === 'scanning' ? 'Đang tìm mạng Wi-Fi…'
    : usb.scanStatus === 'error' ? 'Quét chưa thành công. Bấm Quét lại.'
      : usb.scanStatus === 'ready' ? (usb.networks.length ? `${usb.networks.length} mạng · 2.4 GHz` : 'Không tìm thấy mạng. Quét lại hoặc nhập tên mạng.')
        : 'Kết nối thiết bị để tìm mạng Wi-Fi.';

  return <section className="iot-panel" aria-labelledby="iot-wifi-title" aria-busy={Boolean(usb.busy)}>
    <div className="iot-panel-heading">
      <h2 id="iot-wifi-title"><Wifi size={20} aria-hidden="true" /> Wi-Fi</h2>
      <Button variant="outline" disabled={disabled || !usb.wifiScanSupported} onClick={() => void usb.scanWifi()}>
        <RefreshCw size={16} aria-hidden="true" /> Quét lại
      </Button>
    </div>
    {usb.mode === 'console' && !usb.wifiScanSupported && <p className="iot-notice" role="status">Nạp firmware mới để tự tìm Wi-Fi. Bạn vẫn có thể nhập tên mạng.</p>}
    {usb.mode === 'console' && !usb.provisioned && <div className="iot-actions iot-setup-retry">
      <span className="iot-muted">Thiết lập tự động chưa hoàn tất.</span>
      <Button variant="outline" disabled={disabled} onClick={() => void usb.provision()}>Thiết lập lại</Button>
    </div>}
    <form className="iot-form" onSubmit={async event => {
      event.preventDefault();
      if (canConnect && await usb.configureWifi(ssid, password, save)) { setPassword(''); setShowPassword(false); }
    }}>
      <fieldset disabled={disabled} className="iot-fieldset">
        <legend className="iot-sr-only">Kết nối Wi-Fi</legend>
        <div className="iot-form-grid">
          <div className="iot-stack iot-network-field">
            <label htmlFor="iot-network">Mạng Wi-Fi
              <Select id="iot-network" value={manual ? 'manual' : ssid ? `ssid:${ssid}` : ''} onChange={event => {
                const value = event.target.value;
                setManual(value === 'manual'); setSsid(value.startsWith('ssid:') ? value.slice(5) : ''); setPassword(''); setShowPassword(false);
              }} aria-describedby="iot-scan-status">
                <option value="">Chọn mạng Wi-Fi</option>
                {ssid && !manual && !selected && <option value={`ssid:${ssid}`} disabled>{ssid} · Cần quét lại</option>}
                {usb.networks.map(network => <option key={network.ssid} value={`ssid:${network.ssid}`} disabled={!network.supported}>
                  {network.ssid} · {network.rssi >= -55 ? 'Mạnh' : network.rssi >= -70 ? 'Vừa' : 'Yếu'}{!network.supported ? (network.secure ? ' · Bảo mật chưa hỗ trợ' : ' · Mạng mở chưa hỗ trợ') : ''}
                </option>)}
                <option value="manual">Nhập tên mạng…</option>
              </Select>
            </label>
            {manual && <label htmlFor="iot-ssid">Tên mạng<Input id="iot-ssid" value={ssid} required maxLength={32} onChange={e => { setSsid(e.target.value); setPassword(''); setShowPassword(false); }} autoComplete="off" /></label>}
            <p id="iot-scan-status" className="iot-muted" role="status" aria-live="polite">{scanMessage}</p>
          </div>
          <div className="iot-password-field">
            <label htmlFor="iot-password">Mật khẩu Wi-Fi</label>
            <div className="iot-password-input">
              <Input id="iot-password" type={showPassword ? 'text' : 'password'} value={password} required minLength={8} maxLength={64} disabled={!canConnect} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
              <button type="button" className="iot-password-toggle" disabled={!canConnect} aria-label={showPassword ? 'Ẩn mật khẩu Wi-Fi' : 'Hiện mật khẩu Wi-Fi'} aria-pressed={showPassword} aria-controls="iot-password" onClick={() => setShowPassword(value => !value)}>
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
        <div className="iot-actions"><Button variant="primary" type="submit" disabled={!canConnect || !ssid}>Kết nối Wi-Fi</Button>
          <span className="iot-muted" role="status" aria-live="polite">{usb.wifiStatus}</span>
        </div>
      </fieldset>
      <details className="iot-details"><summary>Cài đặt nâng cao</summary>
        <fieldset disabled={disabled} className="iot-fieldset iot-advanced-fields">
          <legend className="iot-sr-only">Cài đặt nâng cao</legend>
          <label htmlFor="iot-api">Địa chỉ API<Input id="iot-api" type="url" placeholder={usb.backendUrl || 'Tự lấy từ máy chủ'} maxLength={512} value={apiUrl} onChange={e => setApiUrl(e.target.value)} autoComplete="off" /></label>
          <div className="iot-actions"><Button variant="outline" type="button" onClick={async () => {
            if (await usb.provision('', apiUrl)) setApiUrl('');
          }}>Áp dụng cấu hình</Button><span className="iot-muted">{usb.provisioned ? 'Thiết bị đã nhận cấu hình' : 'Chưa hoàn tất thiết lập'}</span></div>
          <label className="iot-checkbox"><input type="checkbox" checked={save} onChange={e => setSave(e.target.checked)} /> Lưu Wi-Fi mã hóa trên máy chủ</label>
        </fieldset>
      </details>
    </form>
  </section>;
}
