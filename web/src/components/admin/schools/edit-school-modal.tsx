'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { vietmapService } from '@/lib/vietmap/vietmap.service';
import type { VietmapSuggestion } from '@/lib/vietmap/types';
import type { SchoolDetail, WeeklySchedule, SchoolLocationImpactResponse } from '@/lib/types';
import {
  CloseIcon,
  SearchIcon,
  SpinnerIcon,
  ImageIcon,
  TrashIcon,
  AlertIcon,
  MapPinIcon,
  CheckIcon,
} from '@/components/icons';
import {
  WeeklyScheduleBuilder,
  validateWeeklySchedule,
} from './weekly-schedule-builder';
import { VietMapPicker } from './vietmap-picker';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface EditSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  school: SchoolDetail;
  userRole?: string;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function EditSchoolModal({
  isOpen,
  onClose,
  onSuccess,
  school,
  userRole,
}: EditSchoolModalProps) {
  // Form fields
  const [name, setName] = useState(school.name || '');
  const [addressText, setAddressText] = useState(school.addressText || '');
  const [latitude, setLatitude] = useState<number | null>(school.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(school.longitude ?? null);
  const [contractStartDate, setContractStartDate] = useState(
    school.contractStartDate ? school.contractStartDate.substring(0, 10) : '',
  );
  const [contractEndDate, setContractEndDate] = useState(
    school.contractEndDate ? school.contractEndDate.substring(0, 10) : '',
  );
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(
    school.weeklySchedule || {},
  );

  // Image handling
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // VietMap search autocomplete state
  const [suggestions, setSuggestions] = useState<VietmapSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingPlace, setIsGettingPlace] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Location Impact State
  const [locationImpact, setLocationImpact] = useState<SchoolLocationImpactResponse | null>(null);
  const [isImpactModalOpen, setIsImpactModalOpen] = useState(false);
  const [relocateReason, setRelocateReason] = useState('');
  const [relocateReasonError, setRelocateReasonError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearImagePreview = useCallback(() => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  }, [imagePreviewUrl]);

  useEffect(() => {
    return () => {
      clearImagePreview();
    };
  }, [clearImagePreview]);

  // Reset form khi mở modal hoặc school thay đổi
  useEffect(() => {
    if (isOpen) {
      setName(school.name || '');
      setAddressText(school.addressText || '');
      setLatitude(school.latitude ?? null);
      setLongitude(school.longitude ?? null);
      setContractStartDate(
        school.contractStartDate ? school.contractStartDate.substring(0, 10) : '',
      );
      setContractEndDate(
        school.contractEndDate ? school.contractEndDate.substring(0, 10) : '',
      );
      setWeeklySchedule(school.weeklySchedule || {});
      setSelectedFile(null);
      clearImagePreview();
      setSuggestions([]);
      setShowSuggestions(false);
      setErrorMessage(null);
      setLocationImpact(null);
      setIsImpactModalOpen(false);
      setRelocateReason('');
      setRelocateReasonError(null);
    }
  }, [isOpen, school, clearImagePreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrorMessage('Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPG, PNG hoặc WebP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrorMessage('Kích thước ảnh vượt quá giới hạn 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    clearImagePreview();
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
  };

  const handleRemoveImage = () => {
    clearImagePreview();
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddressInputChange = (val: string) => {
    setAddressText(val);
    setErrorMessage(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val.trim() || val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await vietmapService.autocomplete(val.trim());
        setSuggestions(results || []);
        setShowSuggestions((results || []).length > 0);
      } catch (err: any) {
        console.warn('VietMap autocomplete error:', err?.message);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelectSuggestion = async (suggestion: VietmapSuggestion) => {
    setShowSuggestions(false);
    setAddressText(suggestion.address || suggestion.display);
    try {
      setIsGettingPlace(true);
      const placeDetail = await vietmapService.getPlaceDetail(suggestion.refId);
      setLatitude(placeDetail.latitude);
      setLongitude(placeDetail.longitude);
      if (placeDetail.addressText) {
        setAddressText(placeDetail.addressText);
      }
    } catch (err: any) {
      setErrorMessage(
        'Không thể lấy chi tiết vị trí từ VietMap: ' +
          (err?.message || 'Lỗi không xác định'),
      );
    } finally {
      setIsGettingPlace(false);
    }
  };

  const executeSave = async (reason?: string, expectedFingerprint?: string) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const messages: string[] = [];

      // 1. Cập nhật vị trí & địa chỉ trường học nếu có thay đổi
      const addressChanged = addressText.trim() !== (school.addressText || '').trim();
      const coordChanged =
        latitude !== null &&
        longitude !== null &&
        (Math.abs(latitude - school.latitude) > 0.00001 ||
          Math.abs(longitude - school.longitude) > 0.00001);
      const isLocationChanged = addressChanged || coordChanged;

      if (isLocationChanged) {
        const locRes = await apiClient.updateSchoolLocation(school.id, {
          addressText: addressText.trim(),
          latitude: latitude!,
          longitude: longitude!,
          reason,
          expectedFingerprint,
        });
        if (locRes?.message) messages.push(locRes.message);
      }

      // 2. Cập nhật lịch học tuần nếu có thay đổi
      const origWeeklySched =
        typeof school.weeklySchedule === 'string'
          ? JSON.parse(school.weeklySchedule)
          : school.weeklySchedule || {};
      const isScheduleChanged =
        JSON.stringify(weeklySchedule) !== JSON.stringify(origWeeklySched);

      if (isScheduleChanged) {
        const schedRes = await apiClient.updateSchoolSchedule(school.id, weeklySchedule);
        if (schedRes?.message) messages.push(schedRes.message);
      }

      // 3. Nếu SYSTEM_ADMIN có thay đổi thời hạn hợp đồng, cập nhật tiếp qua API hợp đồng
      const currentStart = school.contractStartDate ? school.contractStartDate.substring(0, 10) : '';
      const currentEnd = school.contractEndDate ? school.contractEndDate.substring(0, 10) : '';
      if (
        userRole === 'SYSTEM_ADMIN' &&
        contractStartDate &&
        contractEndDate &&
        (contractStartDate !== currentStart || contractEndDate !== currentEnd)
      ) {
        const contractRes = await apiClient.updateSchoolContract(school.id, {
          contractStartDate,
          contractEndDate,
        });
        if (contractRes?.message) messages.push(contractRes.message);
      }

      setIsImpactModalOpen(false);
      onSuccess(messages.join(' '));
    } catch (err: any) {
      setErrorMessage(err?.message || 'Cập nhật trường học thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (userRole !== 'SYSTEM_ADMIN') {
      setErrorMessage('Chỉ Quản trị viên hệ thống (SYSTEM_ADMIN) mới có quyền chỉnh sửa thông tin trường học.');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên trường học.');
      return;
    }

    if (!addressText.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ chi tiết của trường học.');
      return;
    }

    if (latitude === null || longitude === null) {
      setErrorMessage('Vui lòng chọn vị trí trường trên bản đồ hoặc từ gợi ý.');
      return;
    }

    // Validation lịch học tuần
    const scheduleValidation = validateWeeklySchedule(weeklySchedule);
    if (!scheduleValidation.valid) {
      setErrorMessage(scheduleValidation.error || 'Lịch học tuần không hợp lệ.');
      return;
    }

    // Kiểm tra xem địa chỉ hoặc tọa độ có thay đổi không
    const addressChanged = addressText.trim() !== (school.addressText || '').trim();
    const coordChanged =
      Math.abs(latitude - school.latitude) > 0.00001 ||
      Math.abs(longitude - school.longitude) > 0.00001;
    const isLocationChanged = addressChanged || coordChanged;

    if (isLocationChanged) {
      try {
        setIsSubmitting(true);
        const impact = await apiClient.getSchoolLocationImpact(school.id, latitude, longitude);
        const totalAffectedPlans =
          impact.cancelledPlansCount ??
          ((impact.draftPlansCount || 0) + (impact.activePlansCount || 0));

        if (totalAffectedPlans > 0) {
          // Nếu trường có bất kỳ phương án nào -> hiển thị modal cảnh báo xác nhận hủy
          setLocationImpact(impact);
          setRelocateReason(`Thay đổi địa chỉ trường sang ${addressText.trim()}`);
          setRelocateReasonError(null);
          setIsImpactModalOpen(true);
          setIsSubmitting(false);
          return;
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Không thể kiểm tra tác động đổi vị trí');
        setIsSubmitting(false);
        return;
      }
    }

    // Không có phương án nào bị hủy -> Cập nhật trực tiếp không cần hỏi
    await executeSave();
  };

  const handleConfirmRelocate = async () => {
    if (!relocateReason.trim()) {
      setRelocateReasonError('Vui lòng nhập lý do thay đổi vị trí trường (bắt buộc)');
      return;
    }
    setRelocateReasonError(null);
    await executeSave(
      relocateReason.trim(),
      locationImpact?.fingerprint || locationImpact?.expectedFingerprint,
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <Card className="ui-dialog-panel ui-dialog-panel-body bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900">
              Chỉnh sửa thông tin trường học
            </h2>
            <p className="text-xs text-slate-500">
              Cập nhật thông tin, vị trí địa lý và lịch học của trường
            </p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="ui-dialog-body flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertIcon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tên trường & Ảnh đại diện */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên trường học <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Trường Tiểu học Lê Quý Đôn"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                />
              </div>

              {/* Thời hạn hợp đồng (SYSTEM_ADMIN only) */}
              {userRole === 'SYSTEM_ADMIN' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200/50">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bắt đầu hợp đồng
                    </label>
                    <Input
                      type="date"
                      value={contractStartDate}
                      onChange={(e) => setContractStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kết thúc hợp đồng
                    </label>
                    <Input
                      type="date"
                      value={contractEndDate}
                      onChange={(e) => setContractEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <p className="col-span-2 text-[11px] text-slate-500">
                    Chỉ có thể sửa/gia hạn khi trường không có phương án DRAFT/ACTIVE. Ngày bắt đầu phải từ hôm nay trở đi.
                  </p>
                </div>
              )}
            </div>

            {/* Ảnh đại diện */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ảnh đại diện
              </label>
              <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center relative group">
                {imagePreviewUrl || school.imageUrl ? (
                  <Card className="relative w-full h-28 rounded-lg overflow-hidden bg-white border border-slate-200">
                    <img
                      src={imagePreviewUrl || school.imageUrl || ''}
                      alt="Xem trước"
                      className="w-full h-full object-cover"
                    />
                    {imagePreviewUrl && (
                      <Button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-1.5 right-1.5 p-1 bg-white/90 text-rose-600 rounded-md hover:bg-white shadow-xs"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </Card>
                ) : (
                  <div className="py-4 space-y-1">
                    <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-[11px] text-slate-500">Chưa có ảnh</p>
                  </div>
                )}
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-800"
                >
                  {selectedFile || school.imageUrl ? 'Thay ảnh' : 'Chọn ảnh'}
                </Button>
              </div>
            </div>
          </div>

          {/* Địa chỉ & Chọn vị trí VietMap */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Địa chỉ chi tiết <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={addressText}
                  onChange={(e) => handleAddressInputChange(e.target.value)}
                  placeholder="Nhập địa chỉ trường học..."
                  className="w-full pl-8 pr-8 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                />
                <MapPinIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                {isSearching && (
                  <SpinnerIcon className="w-3.5 h-3.5 animate-spin text-amber-600 absolute right-2.5 top-2.5" />
                )}
              </div>

              {/* Dropdown gợi ý VietMap */}
              {showSuggestions && suggestions.length > 0 && (
                <Card className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                  {suggestions.map((sugg, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(sugg)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50/70 border-b border-slate-100 last:border-0"
                    >
                      <div className="font-medium text-slate-800">{sugg.display}</div>
                      {sugg.address && (
                        <div className="text-[11px] text-slate-500">{sugg.address}</div>
                      )}
                    </Button>
                  ))}
                </Card>
              )}
            </div>

            {/* Bản đồ chọn vị trí */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">Vị trí trên bản đồ:</span>
                {latitude !== null && longitude !== null && (
                  <span className="text-slate-500">
                    Tọa độ: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </span>
                )}
              </div>
              <VietMapPicker
                latitude={latitude}
                longitude={longitude}
                onChangeCoordinates={(lat: number, lng: number) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                onAddressSelect={(addr: string) => {
                  if (addr) setAddressText(addr);
                }}
              />
            </div>
          </div>

          {/* Lịch học tuần */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700">
              Lịch học tuần
            </label>
            <WeeklyScheduleBuilder
              value={weeklySchedule}
              onChange={setWeeklySchedule}
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </Button>
            <Button variant="primary" size="sm"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-slate-900 bg-primary hover:bg-amber-400 rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
            >
              {isSubmitting && <SpinnerIcon className="w-4 h-4 animate-spin" />}
              <span>Lưu thay đổi</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Modal xác nhận tác động đổi vị trí trường học */}
      {isImpactModalOpen && locationImpact && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <Card className="ui-dialog-panel bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                <AlertIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Xác nhận đổi địa chỉ / vị trí trường học
                </h3>
                <p className="text-xs text-slate-500">
                  Đổi địa chỉ trường sẽ cascade hủy toàn bộ phương án tuyến DRAFT và ACTIVE của trường.
                </p>
              </div>
            </div>

            {/* Thống kê tác động */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span>Phương án DRAFT/ACTIVE của trường bị hủy:</span>
                <span className="font-bold text-rose-600">
                  {locationImpact.cancelledPlansCount ?? ((locationImpact.draftPlansCount || 0) + (locationImpact.activePlansCount || 0))} phương án
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Chuyến xe SCHEDULED liên quan bị hủy:</span>
                <span className="font-bold text-rose-600">
                  {locationImpact.cancelledTripsCount ?? (locationImpact.scheduledTripsCount || 0)} chuyến
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Chuyến xe đang chạy (IN_PROGRESS) giữ nguyên:</span>
                <span className="font-bold text-emerald-600">
                  {locationImpact.inProgressTripsPreservedCount ?? (locationImpact.inProgressTripsCount || 0)} chuyến
                </span>
              </div>
            </div>

            {/* Lý do thay đổi */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Lý do thay đổi vị trí trường <span className="text-rose-500">*</span>
              </label>
              <Textarea
                value={relocateReason}
                onChange={(e) => {
                  setRelocateReason(e.target.value);
                  setRelocateReasonError(null);
                }}
                rows={3}
                placeholder="Nhập lý do thay đổi tọa độ trường học..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
              {relocateReasonError && (
                <p className="text-xs text-rose-600 font-medium">{relocateReasonError}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsImpactModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmRelocate}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
              >
                {isSubmitting && <SpinnerIcon className="w-4 h-4 animate-spin" />}
                <span>Xác nhận & Hủy phương án</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
