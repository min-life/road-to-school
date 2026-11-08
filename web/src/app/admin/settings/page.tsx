'use client';

import { ServiceCalendarPanel } from '@/components/admin/schools/service-calendar-panel';
import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { vietnamDateKey } from '@/lib/business-improvements';
import { useRouteQuery } from '@/hooks/use-route-query';
import { toast } from '@/stores/toast-store';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { authStorage } from '@/lib/auth-storage';
import { ApiError, apiClient } from '@/lib/api-client';
import { ParkingLot, ParkingLotImpactResponse } from '@/lib/types';
import { vietmapService, VietmapSuggestion } from '@/lib/vietmap';
import {
  LogoutIcon,
  EyeIcon,
  EyeOffIcon,
  SpinnerIcon,
  AlertIcon,
  MapPinIcon,
} from '@/components/icons';
import { LogoutDialog } from '@/components/admin/logout-dialog';
import { formatRoleLabel, getAvatarInitial } from '@/components/admin/admin-nav.config';
import { VietMapPicker } from '@/components/admin/schools/vietmap-picker';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ContextLink } from '@/components/admin/common/context-navigation';

type SettingsTab = 'ACCOUNT' | 'PARKING_LOT' | 'HOLIDAYS';

export default function AdminSettingsPage() {
  const { user, logout, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('ACCOUNT');
  useRouteQuery(String(user?.id), query => {
    setActiveTab(user?.role === 'SYSTEM_ADMIN' ? query.get('tab') === 'holidays' ? 'HOLIDAYS' : query.get('tab') === 'parking' ? 'PARKING_LOT' : 'ACCOUNT' : 'ACCOUNT');
  });

  // Logout dialog
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 1. Avatar Update State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [avatarErrorMsg, setAvatarErrorMsg] = useState<string | null>(null);

  // 2. Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const [passErrorMsg, setPassErrorMsg] = useState<string | null>(null);

  // 3. Parking Lot Settings State (SYSTEM_ADMIN only)
  const [parkingLot, setParkingLot] = useState<ParkingLot | null>(null);
  const [isLoadingParkingLot, setIsLoadingParkingLot] = useState(false);
  const [parkingAddress, setParkingAddress] = useState('');
  const [parkingLat, setParkingLat] = useState<number | null>(null);
  const [parkingLng, setParkingLng] = useState<number | null>(null);
  const [parkingUnconfigured, setParkingUnconfigured] = useState(false);
  const [parkingRadius, setParkingRadius] = useState('50');
  const [parkingSuggestions, setParkingSuggestions] = useState<VietmapSuggestion[]>([]);
  const [isSearchingParking, setIsSearchingParking] = useState(false);
  const [showParkingSuggestions, setShowParkingSuggestions] = useState(false);
  const [isSavingParkingLot, setIsSavingParkingLot] = useState(false);

  const [parkingErrorMsg, setParkingErrorMsg] = useState<string | null>(null);
  const parkingSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parking relocation impact modal state
  const [parkingEffectiveDate, setParkingEffectiveDate] = useState(() => vietnamDateKey(1));
  const [scheduledAction, setScheduledAction] = useState<'apply' | 'cancel' | null>(null);
  const [scheduledBusy, setScheduledBusy] = useState(false);
  const [scheduledError, setScheduledError] = useState('');
  const [parkingImpact, setParkingImpact] = useState<ParkingLotImpactResponse | null>(null);
  const [isParkingImpactModalOpen, setIsParkingImpactModalOpen] = useState(false);
  const [parkingRelocateReason, setParkingRelocateReason] = useState('');
  const [parkingRelocateReasonError, setParkingRelocateReasonError] = useState<string | null>(null);
  const [isConfirmingRelocation, setIsConfirmingRelocation] = useState(false);

  // Tải dữ liệu bãi đỗ xe nếu là SYSTEM_ADMIN
  const fetchParkingLot = useCallback(async () => {
    if (user?.role !== 'SYSTEM_ADMIN') return;
    try {
      setIsLoadingParkingLot(true);
      setParkingErrorMsg(null);
      const data = await apiClient.getParkingLot();
      setParkingUnconfigured(false);
      if (data) {
        setParkingLot(data);
        setParkingAddress(data.addressText || '');
        setParkingLat(data.latitude);
        setParkingLng(data.longitude);
        setParkingRadius(String(data.maxOperatingRadiusKm ?? 50));
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 409 && err.message === 'Cần cấu hình bãi trung tâm trước khi lập lịch phục vụ') {
        setParkingUnconfigured(true); setParkingLot(null);
        setParkingLat(null); setParkingLng(null); setParkingAddress('');
      } else {
        setParkingUnconfigured(false);
        setParkingErrorMsg(err?.message || 'Không thể tải cấu hình bãi xe. Vui lòng làm mới trang.');
      }
    } finally {
      setIsLoadingParkingLot(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchParkingLot();
  }, [fetchParkingLot]);

  if (!user) return null;

  const roleLabel = formatRoleLabel(user.role);
  const initial = getAvatarInitial(user.fullName);

  // ==========================================
  // Xử lý Cập nhật Avatar
  // ==========================================
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    setAvatarErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setAvatarErrorMsg('Định dạng không hợp lệ. Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarErrorMsg('Kích thước tệp vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setSelectedAvatarFile(file);
    setAvatarPreviewUrl(preview);
  };

  const handleUploadAvatar = async () => {
    if (!selectedAvatarFile) return;
    setIsUploadingAvatar(true);

    setAvatarErrorMsg(null);

    try {
      const res = await apiClient.updateAvatar(selectedAvatarFile);
      const updatedUser = { ...user, avatarUrl: res.avatarUrl };
      setUser(updatedUser);
      authStorage.setUser(updatedUser);
      toast.success('Cập nhật ảnh đại diện thành công');
      setSelectedAvatarFile(null);
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
        setAvatarPreviewUrl(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setAvatarErrorMsg(err?.message || 'Tải ảnh lên thất bại. Vui lòng thử lại.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ==========================================
  // Xử lý Đổi Mật Khẩu
  // ==========================================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setPassErrorMsg(null);

    if (!currentPassword) {
      setPassErrorMsg('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (newPassword.length < 8) {
      setPassErrorMsg('Mật khẩu mới phải có tối thiểu 8 ký tự');
      return;
    }
    if (newPassword === currentPassword) {
      setPassErrorMsg('Mật khẩu mới không được trùng với mật khẩu hiện tại');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassErrorMsg('Xác nhận mật khẩu mới không khớp');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await apiClient.changePassword({
        currentPassword,
        newPassword,
      });
      toast.success(res.message || 'Đổi mật khẩu thành công');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassErrorMsg(err?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setIsChangingPass(false);
    }
  };

  // ==========================================
  // Xử lý Bãi đỗ xe trung tâm (VietMap)
  // ==========================================
  const handleParkingAddressInput = (text: string) => {
    setParkingAddress(text);

    setParkingErrorMsg(null);

    if (parkingSearchTimeoutRef.current) {
      clearTimeout(parkingSearchTimeoutRef.current);
    }

    if (!text.trim() || text.trim().length < 2) {
      setParkingSuggestions([]);
      setShowParkingSuggestions(false);
      return;
    }

    parkingSearchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearchingParking(true);
        const results = await vietmapService.autocomplete(text.trim());
        setParkingSuggestions(results || []);
        setShowParkingSuggestions((results || []).length > 0);
      } catch (err: any) {
        console.warn('VietMap search error:', err?.message);
      } finally {
        setIsSearchingParking(false);
      }
    }, 300);
  };

  const handleSelectParkingSuggestion = async (sugg: VietmapSuggestion) => {
    setShowParkingSuggestions(false);
    setParkingAddress(sugg.address || sugg.display);
    try {
      setIsSearchingParking(true);
      const place = await vietmapService.getPlaceDetail(sugg.refId);
      if (place && typeof place.latitude === 'number' && typeof place.longitude === 'number') {
        setParkingLat(place.latitude);
        setParkingLng(place.longitude);
      }
    } catch (err: any) {
      console.warn('Error fetching place details:', err?.message);
    } finally {
      setIsSearchingParking(false);
    }
  };

  const handleSaveParkingLot = async (e: React.FormEvent) => {
    e.preventDefault();

    setParkingErrorMsg(null);
    if (isSavingParkingLot || isSearchingParking || (!parkingLot && !parkingUnconfigured) || parkingLot?.scheduledChange) return;

    if (!parkingAddress.trim()) {
      setParkingErrorMsg('Địa chỉ bãi xe không được để trống');
      return;
    }

    if (parkingLat === null || parkingLng === null) {
      setParkingErrorMsg('Vui lòng chọn vị trí tọa độ bãi xe trên bản đồ');
      return;
    }

    const radius = Number(parkingRadius);
    if (!Number.isFinite(radius) || radius <= 0 || radius > 500) {
      setParkingErrorMsg('Bán kính phục vụ phải lớn hơn 0 và không quá 500 km.'); return;
    }
    setIsSavingParkingLot(true);
    try {
      if (parkingUnconfigured) {
        const updated = await apiClient.updateParkingLot({ addressText: parkingAddress.trim(), latitude: parkingLat, longitude: parkingLng, maxOperatingRadiusKm: radius });
        setParkingLot(updated); setParkingUnconfigured(false);
        toast.success('Đã cấu hình bãi xe trung tâm.'); return;
      }
      // 1. Kiểm tra xem tọa độ có thay đổi so với hiện tại không
      const coordsChanged =
        !parkingLot ||
        Math.abs((parkingLot.latitude || 0) - parkingLat) > 1e-6 ||
        Math.abs((parkingLot.longitude || 0) - parkingLng) > 1e-6;

      if (!coordsChanged) {
        // Chỉ sửa nhãn địa chỉ, tọa độ giữ nguyên -> Cập nhật trực tiếp
        const updated = await apiClient.updateParkingLot({
          maxOperatingRadiusKm: radius,
          addressText: parkingAddress.trim(),
          latitude: parkingLat,
          longitude: parkingLng,
        });
        setParkingLot(updated);
        toast.success('Cập nhật địa chỉ bãi xe trung tâm thành công (không đổi tọa độ)');
        return;
      }

      const impact = await apiClient.getParkingLotImpact(parkingLat, parkingLng, parkingEffectiveDate);
      setParkingImpact(impact);
      setParkingRelocateReason('Bãi xe trung tâm thay đổi vị trí');
      setParkingRelocateReasonError(null);
      setIsParkingImpactModalOpen(true);
    } catch (err: any) {
      setParkingErrorMsg(err?.message || 'Cập nhật bãi xe thất bại. Vui lòng thử lại.');
    } finally {
      setIsSavingParkingLot(false);
    }
  };

  const handleConfirmParkingRelocation = async () => {
    if (!parkingRelocateReason.trim()) {
      setParkingRelocateReasonError('Vui lòng nhập lý do thay đổi vị trí bãi xe (bắt buộc)');
      return;
    }
    if (isConfirmingRelocation || parkingLat === null || parkingLng === null || !parkingImpact) return;

    const radius = Number(parkingRadius);
    if (!Number.isFinite(radius) || radius <= 0 || radius > 500) { setParkingRelocateReasonError('Bán kính phải lớn hơn 0 và không quá 500 km.'); return; }
    setIsConfirmingRelocation(true);
    setParkingRelocateReasonError(null);
    try {
      const fingerprint = parkingImpact.expectedFingerprint || parkingImpact.fingerprint;
      const updated = await apiClient.updateParkingLot({
        addressText: parkingAddress.trim(),
        latitude: parkingLat,
        longitude: parkingLng,
        reason: parkingRelocateReason.trim(),
        maxOperatingRadiusKm: radius,
        expectedFingerprint: fingerprint,
        effectiveDate: parkingEffectiveDate,
      });
      setParkingLot(updated);
      setIsParkingImpactModalOpen(false);
      await fetchParkingLot();
      toast.success('Đã hẹn dời bãi xe. Tác động được áp dụng khi đến ngày hiệu lực.');
    } catch (err: any) {
      setIsParkingImpactModalOpen(false);
      setParkingImpact(null);
      setParkingErrorMsg(err?.message || 'Dữ liệu đã thay đổi. Vui lòng xem tác động lại.');
    } finally {
      setIsConfirmingRelocation(false);
    }
  };

  const handleScheduledAction = async () => {
    if (!scheduledAction || scheduledBusy) return;
    setScheduledBusy(true); setScheduledError('');
    try {
      if (scheduledAction === 'apply') {
        const result = await apiClient.applyScheduledParkingChange();
        if (!result.applied) throw new Error('Chưa đến ngày hiệu lực hoặc lịch thay đổi không còn tồn tại.');
      } else await apiClient.cancelScheduledParkingChange();
      await fetchParkingLot();
      toast.success(scheduledAction === 'apply' ? 'Đã áp dụng vị trí bãi mới.' : 'Đã hủy lịch dời bãi.');
      setScheduledAction(null);
    } catch (cause) { setScheduledError(cause instanceof Error ? cause.message : 'Không thể cập nhật lịch dời bãi.'); }
    finally { setScheduledBusy(false); }
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setIsLogoutDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Điều hướng Tabs */}
      <PageHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Cài đặt hệ thống
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Quản lý tài khoản cá nhân và cấu hình vận hành
          </p>
        </div>

        {/* Tabs switcher nếu là SYSTEM_ADMIN */}
        {(user.role === 'SYSTEM_ADMIN' || user.role === 'SCHOOL_ADMIN') && (
          <div className="inline-flex flex-wrap p-1 rounded-xl bg-slate-100 border border-slate-200/80 self-start sm:self-auto">
            {user.role === 'SCHOOL_ADMIN' && <ContextLink href="/admin/calendar" className="ui-button" data-variant="outline" data-size="sm">Lịch vận hành</ContextLink>}
            <Button
              type="button"
              onClick={() => setActiveTab('ACCOUNT')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'ACCOUNT'
                  ? 'bg-white text-foreground shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tài khoản
            </Button>
            {user.role === 'SYSTEM_ADMIN' && <Button
              type="button"
              onClick={() => setActiveTab('PARKING_LOT')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'PARKING_LOT'
                  ? 'bg-white text-foreground shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vị trí bãi xe
            </Button>}
            {user.role === 'SYSTEM_ADMIN' && <Button type="button" onClick={() => setActiveTab('HOLIDAYS')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${activeTab === 'HOLIDAYS' ? 'bg-white text-foreground shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
              Lịch nghỉ nhà xe
            </Button>}
          </div>
        )}
      </PageHeader>

      {/* ============================================================= */}
      {/* TAB 1: CÀI ĐẶT TÀI KHOẢN (Cho cả SYSTEM_ADMIN & SCHOOL_ADMIN)  */}
      {/* ============================================================= */}
      {activeTab === 'HOLIDAYS' && user.role === 'SYSTEM_ADMIN' && <ServiceCalendarPanel key={`operator:${user.id}`} role={user.role} operatorOnly />}

      {activeTab === 'ACCOUNT' && (
        <div className="space-y-6">
          {/* Card 1: Thông tin & Đổi Avatar */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <h2 className="text-base font-bold text-foreground mb-5 pb-3 border-b border-slate-100">
              Ảnh đại diện & Thông tin cá nhân
            </h2>



            {avatarErrorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
                <AlertIcon className="w-5 h-5 text-red-600 shrink-0" />
                <span>{avatarErrorMsg}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
              {/* Avatar hiển thị */}
              <div className="relative">
                {avatarPreviewUrl || user.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarPreviewUrl || user.avatarUrl!}
                    alt={user.fullName}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary shadow-xs"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary text-foreground font-bold text-3xl flex items-center justify-center border-2 border-amber-300 shadow-xs">
                    {initial}
                  </div>
                )}
              </div>

              {/* Thao tác chọn ảnh */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                  <Button variant="outline" size="default"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    Chọn ảnh mới
                  </Button>

                  {selectedAvatarFile && (
                    <Button variant="primary" size="default"
                      type="button"
                      onClick={handleUploadAvatar}
                      disabled={isUploadingAvatar}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-amber-400 text-sm font-bold text-foreground transition-colors cursor-pointer flex items-center gap-2"
                    >
                      {isUploadingAvatar && <SpinnerIcon className="w-4 h-4 animate-spin" />}
                      <span>Lưu ảnh</span>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Hỗ trợ định dạng JPEG, PNG, WebP (Tối đa 5MB).
                </p>
              </div>
            </div>

            {/* Chi tiết tài khoản */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block mb-1">Họ và tên</span>
                <span className="font-semibold text-foreground">{user.fullName}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block mb-1">Vai trò quản trị</span>
                <span className="font-semibold text-foreground">{roleLabel}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block mb-1">Địa chỉ Email</span>
                <span className="font-semibold text-foreground break-all">{user.email || '—'}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block mb-1">Số điện thoại</span>
                <span className="font-semibold text-foreground">{user.phone || '—'}</span>
              </div>
            </div>
          </Card>

          {/* Card 2: Đổi Mật Khẩu */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <h2 className="text-base font-bold text-foreground mb-2 pb-3 border-b border-slate-100">
              Đổi mật khẩu
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Sau khi đổi mật khẩu thành công, toàn bộ các phiên đăng nhập khác sẽ được thu hồi tự động để bảo mật.
            </p>



            {passErrorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
                <AlertIcon className="w-5 h-5 text-red-600 shrink-0" />
                <span>{passErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              {/* Mật khẩu hiện tại */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật khẩu hiện tại *
                </label>
                <div className="relative">
                  <Input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm pr-10"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                  <Button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật khẩu mới (tối thiểu 8 ký tự) *
                </label>
                <div className="relative">
                  <Input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm pr-10"
                    placeholder="Nhập mật khẩu mới"
                  />
                  <Button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPass ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Xác nhận mật khẩu mới *
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm pr-10"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                  <Button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="primary" size="default"
                  type="submit"
                  disabled={isChangingPass}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-sm font-bold text-foreground transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  {isChangingPass && <SpinnerIcon className="w-4 h-4 animate-spin" />}
                  <span>Cập nhật mật khẩu</span>
                </Button>
              </div>
            </form>
          </Card>

          {/* Card 3: Đăng xuất */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Phiên đăng nhập</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Đăng xuất tài khoản khỏi thiết bị hiện tại
              </p>
            </div>
            <Button variant="outline" size="default"
              type="button"
              onClick={() => setIsLogoutDialogOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-semibold transition-colors cursor-pointer shrink-0"
            >
              <LogoutIcon className="w-4 h-4" />
              <span>Đăng xuất</span>
            </Button>
          </Card>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: VỊ TRÍ BÃI XE TRUNG TÂM (Chỉ hiển thị cho SYSTEM_ADMIN) */}
      {/* ============================================================= */}
      {activeTab === 'PARKING_LOT' && user.role === 'SYSTEM_ADMIN' && (
        <Card className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Vị trí bãi đỗ xe trung tâm
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Cấu hình địa điểm trung tâm duy nhất của nhà xe phục vụ lập lộ trình và điều phối phương tiện.
            </p>
          </div>



          {parkingErrorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
              <AlertIcon className="w-5 h-5 text-red-600 shrink-0" />
              <span>{parkingErrorMsg}</span>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm" hidden={!parkingLot}>
            <p className="font-semibold">Bãi đang áp dụng</p><p>{parkingLot?.addressText}</p>
          </div>
          {parkingLot?.scheduledChange && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-semibold">Thay đổi đã hẹn · {parkingLot.scheduledChange.effectiveDate.split('-').reverse().join('/')}</p>
            <p>{parkingLot.scheduledChange.newAddressText}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { setScheduledError(''); setScheduledAction('cancel'); }}>Hủy lịch thay đổi</Button>
              {parkingLot.scheduledChange.effectiveDate <= vietnamDateKey() && <Button variant="primary" onClick={() => { setScheduledError(''); setScheduledAction('apply'); }}>Áp dụng vị trí mới</Button>}
              <Button variant="outline" onClick={() => void fetchParkingLot()}>Làm mới</Button>
            </div>
          </div>}
          <form onSubmit={handleSaveParkingLot} className="space-y-5">
            <fieldset disabled={(!parkingLot && !parkingUnconfigured) || !!parkingLot?.scheduledChange || isSavingParkingLot || isLoadingParkingLot} className="space-y-5">
            {parkingUnconfigured && <p role="status" className="lifecycle-notice">Chưa cấu hình bãi trung tâm. Chọn địa chỉ và vị trí để bắt đầu.</p>}
            <div className="max-w-xs space-y-1.5"><label htmlFor="parking-radius" className="block text-sm font-semibold">Bán kính phục vụ (km)</label>
              <Input className="w-full border bg-white px-3 py-2" id="parking-radius" type="number" min="0" max="500" step="any" required value={parkingRadius} onChange={event => { setParkingRadius(event.target.value); setParkingImpact(null); }} />
            </div>
            {/* Địa chỉ bãi xe với Autocomplete */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Địa chỉ bãi xe *
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={parkingAddress}
                  onChange={(e) => handleParkingAddressInput(e.target.value)}
                  placeholder="Nhập địa chỉ bãi xe để tìm kiếm..."
                  required
                  className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <MapPinIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                {isSearchingParking && (
                  <SpinnerIcon className="w-4 h-4 text-slate-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Danh sách gợi ý từ VietMap */}
              {showParkingSuggestions && parkingSuggestions.length > 0 && (
                <Card className="absolute z-20 w-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl max-h-56 overflow-y-auto">
                  {parkingSuggestions.map((sugg) => (
                    <Button
                      key={sugg.refId}
                      type="button"
                      onClick={() => handleSelectParkingSuggestion(sugg)}
                      className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-amber-50 border-b border-slate-100 last:border-0 flex items-start gap-2 cursor-pointer"
                    >
                      <MapPinIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-800 block">{sugg.name}</span>
                        <span className="text-slate-500 block text-[11px]">{sugg.address || sugg.display}</span>
                      </div>
                    </Button>
                  ))}
                </Card>
              )}
            </div>

            {/* Khung bản đồ VietMap Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Xác nhận tọa độ bãi xe trên bản đồ
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Bạn có thể kéo thả dấu ghim (Marker) hoặc nhấp vào bản đồ để điều chỉnh vị trí chính xác.
              </p>
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <VietMapPicker
                  latitude={parkingLat}
                  longitude={parkingLng}
                  onChangeCoordinates={(lat, lng) => {
                    setParkingLat(lat);
                    setParkingLng(lng);
                  }}
                  onAddressSelect={(addr) => {
                    if (addr) setParkingAddress(addr);
                  }}
                />
              </div>
            </div>

            {!parkingUnconfigured && <div className="max-w-xs space-y-1.5"><label htmlFor="parking-effective-date" className="block text-sm font-semibold">Ngày hiệu lực dời bãi</label>
              <Input id="parking-effective-date" type="date" min={vietnamDateKey(1)} required value={parkingEffectiveDate} onChange={event => { setParkingEffectiveDate(event.target.value); setParkingImpact(null); }} />
            </div>}
            {/* Nút Lưu cấu hình */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                {parkingLot?.updatedAt
                  ? `Cập nhật lần cuối: ${new Date(parkingLot.updatedAt).toLocaleString('vi-VN')}`
                  : 'Chưa có thông tin cập nhật'}
              </span>

              <Button variant="primary" size="default"
                type="submit"
                disabled={isSavingParkingLot || isSearchingParking}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-sm font-bold text-foreground transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
              >
                {isSavingParkingLot && <SpinnerIcon className="w-4 h-4 animate-spin" />}
                <span>{parkingUnconfigured ? 'Lưu cấu hình bãi' : 'Xem tác động / Lưu cấu hình'}</span>
              </Button>
            </div>
            </fieldset>
          </form>
        </Card>
      )}

      <LifecycleDialog open={isParkingImpactModalOpen && !!parkingImpact} title="Xác nhận hẹn dời bãi" busy={isConfirmingRelocation} onClose={() => setIsParkingImpactModalOpen(false)}
        footer={<><Button variant="outline" disabled={isConfirmingRelocation} onClick={() => setIsParkingImpactModalOpen(false)}>Quay lại</Button><Button variant="primary" disabled={isConfirmingRelocation || !parkingRelocateReason.trim()} onClick={handleConfirmParkingRelocation}>{isConfirmingRelocation ? 'Đang lưu…' : 'Xác nhận'}</Button></>}>
        {parkingImpact && <div className="space-y-4 text-sm">
          <p className="font-semibold">{parkingAddress}</p><p>Ngày hiệu lực: {parkingEffectiveDate.split('-').reverse().join('/')}</p>
          <dl className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex justify-between gap-4"><dt>Phương án cần tối ưu lại</dt><dd className="font-bold">{parkingImpact.plansNeedingReoptimizationCount}</dd></div>
            <div className="flex justify-between gap-4"><dt>Chuyến đã lên lịch bị hủy từ ngày hiệu lực</dt><dd className="font-bold text-rose-600">{parkingImpact.tripsCancelledAfterEffectiveDateCount}</dd></div>
            <div className="flex justify-between gap-4"><dt>Chuyến trước ngày hiệu lực giữ nguyên</dt><dd className="font-bold">{parkingImpact.tripsPreservedBeforeEffectiveDateCount}</dd></div>
          </dl>
          <label htmlFor="parking-reason" className="block font-semibold">Lý do thay đổi *</label>
          <Textarea id="parking-reason" rows={3} value={parkingRelocateReason} onChange={event => setParkingRelocateReason(event.target.value)} />
          {parkingRelocateReasonError && <p role="alert" className="text-rose-600">{parkingRelocateReasonError}</p>}
        </div>}
      </LifecycleDialog>
      <LifecycleDialog open={!!scheduledAction} title={scheduledAction === 'apply' ? 'Áp dụng vị trí bãi mới?' : 'Hủy lịch dời bãi?'} busy={scheduledBusy} onClose={() => setScheduledAction(null)}
        footer={<><Button variant="outline" disabled={scheduledBusy} onClick={() => setScheduledAction(null)}>Quay lại</Button><Button variant={scheduledAction === 'cancel' ? 'danger' : 'primary'} disabled={scheduledBusy} onClick={handleScheduledAction}>Xác nhận</Button></>}>
        <p className="text-sm">{scheduledAction === 'apply' ? 'Vị trí mới sẽ được dùng khi tối ưu lại phương án. Thao tác này không tự sinh lại chuyến.' : 'Hủy lịch dời bãi trước hạn; các chuyến hiện tại được giữ nguyên.'}</p>
        {scheduledError && <p role="alert" className="mt-3 text-sm text-rose-600">{scheduledError}</p>}
      </LifecycleDialog>

      {/* Logout Confirmation Dialog */}
      <LogoutDialog
        isOpen={isLogoutDialogOpen}
        isLoading={isLoggingOut}
        onClose={() => !isLoggingOut && setIsLogoutDialogOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
}
