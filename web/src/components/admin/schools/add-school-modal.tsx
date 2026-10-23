'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { vietmapService } from '@/lib/vietmap/vietmap.service';
import type { VietmapSuggestion } from '@/lib/vietmap/types';
import type { WeeklySchedule } from '@/lib/types';
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
import { Tooltip } from './tooltip';

interface AddSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function AddSchoolModal({
  isOpen,
  onClose,
  onSuccess,
}: AddSchoolModalProps) {
  // Form fields
  const [name, setName] = useState('');
  const [addressText, setAddressText] = useState('');
  // Internal coordinate state (hidden from UI)
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});

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

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dọn dẹp object URL khi unmount hoặc chọn file mới để tránh memory leak
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

  // Reset form khi modal đóng/mở
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setAddressText('');
      setLatitude(null);
      setLongitude(null);
      setContractStartDate('');
      setContractEndDate('');
      setWeeklySchedule({});
      setSelectedFile(null);
      clearImagePreview();
      setSuggestions([]);
      setShowSuggestions(false);
      setErrorMessage(null);
    }
  }, [isOpen, clearImagePreview]);

  // Xử lý chọn ảnh
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrorMessage('Định dạng ảnh không hợp lệ. Vui lòng chọn ảnh định dạng JPEG, PNG hoặc WebP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrorMessage('Kích thước ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    clearImagePreview();
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setImagePreviewUrl(url);
  };

  const handleRemoveImage = () => {
    clearImagePreview();
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Debounced address autocomplete & stale coordinate invalidation
  const handleAddressInputChange = (val: string) => {
    setAddressText(val);
    setErrorMessage(null);

    // Khi người dùng tự tay sửa địa chỉ sau khi đã có tọa độ,
    // làm mất hiệu lực tọa độ cũ để tránh gửi tọa độ cũ không khớp địa chỉ mới
    if (latitude !== null || longitude !== null) {
      setLatitude(null);
      setLongitude(null);
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val || val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await vietmapService.autocomplete(val.trim());
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (err: any) {
        console.warn('VietMap autocomplete error:', err?.message);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Chọn gợi ý địa điểm từ Autocomplete v4 -> gọi Place v4 lấy Lat/Lng
  const handleSelectSuggestion = async (suggestion: VietmapSuggestion) => {
    setShowSuggestions(false);
    const displayAddr = suggestion.display || suggestion.address || suggestion.name;
    setAddressText(displayAddr);

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

  // Submit tạo trường
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validation tên
    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên trường học.');
      return;
    }

    // 2. Validation địa chỉ
    if (!addressText.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ chi tiết của trường học.');
      return;
    }

    // 3. Validation tọa độ (chống gửi null hoặc tọa độ giả)
    if (latitude === null || longitude === null) {
      setErrorMessage('Vui lòng chọn vị trí trường trên bản đồ hoặc từ danh sách gợi ý địa chỉ.');
      return;
    }

    // 4. Validation hợp đồng
    if (!contractStartDate) {
      setErrorMessage('Vui lòng chọn ngày bắt đầu hợp đồng.');
      return;
    }

    if (!contractEndDate) {
      setErrorMessage('Vui lòng chọn ngày kết thúc hợp đồng.');
      return;
    }

    if (contractEndDate < contractStartDate) {
      setErrorMessage('Ngày kết thúc hợp đồng phải sau hoặc cùng ngày bắt đầu hợp đồng.');
      return;
    }

    // 5. Validation lịch học tuần
    const scheduleValidation = validateWeeklySchedule(weeklySchedule);
    if (!scheduleValidation.valid) {
      setErrorMessage(scheduleValidation.error || 'Lịch học tuần không hợp lệ.');
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('addressText', addressText.trim());
      formData.append('latitude', String(latitude));
      formData.append('longitude', String(longitude));
      formData.append('contractStartDate', contractStartDate);
      formData.append('contractEndDate', contractEndDate);
      formData.append('weeklySchedule', JSON.stringify(weeklySchedule));

      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      await apiClient.createSchool(formData);

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Không thể tạo trường học. Vui lòng kiểm tra lại thông tin và thử lại.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hasLocation = latitude !== null && longitude !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-add-school-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      {/* Modal Dialog Container */}
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl z-10 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2
              id="modal-add-school-title"
              className="text-lg font-bold text-slate-800"
            >
              Thêm trường học mới
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Nhập thông tin cơ bản, vị trí địa lý và cấu hình lịch học
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng biểu mẫu"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
              <AlertIcon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* 1. Thông tin chung */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              1. Thông tin cơ bản
            </h3>

            <div>
              <label
                htmlFor="school-name"
                className="block text-sm font-semibold text-slate-800 mb-1"
              >
                Tên trường học <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="school-name"
                value={name}
                disabled={isSubmitting}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Trường Tiểu học Lê Quý Đôn"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                required
              />
            </div>

            {/* Ảnh đại diện trường */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-sm font-semibold text-slate-800">
                  Ảnh trường học
                </label>
                <Tooltip content="Ảnh đại diện giúp phụ huynh và quản trị viên dễ dàng nhận diện trường. Hỗ trợ JPEG, PNG, WebP tối đa 5MB." />
              </div>

              {imagePreviewUrl ? (
                <div className="flex items-center gap-4 p-3 border border-amber-200 rounded-xl bg-amber-50/40">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                    <img
                      src={imagePreviewUrl}
                      alt="Xem trước ảnh trường"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {selectedFile?.name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1 mt-2 text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      <span>Xóa ảnh</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="school-image"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={isSubmitting}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-slate-300 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    <span>Chọn ảnh đại diện...</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. Địa chỉ & Vị trí (Refactored Single Address Input UX) */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2. Địa chỉ & Vị trí
            </h3>

            {/* Ô nhập địa chỉ chi tiết duy nhất (Single Address Input) */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="school-address-input"
                    className="block text-sm font-semibold text-slate-800"
                  >
                    Địa chỉ chi tiết <span className="text-red-500">*</span>
                  </label>
                  <Tooltip content="Nhập địa chỉ để tìm kiếm gợi ý từ VietMap hoặc tự chỉnh sửa số nhà, tên đường chi tiết." />
                </div>
                {hasLocation && (
                  <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span>Vị trí khớp bản đồ</span>
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  id="school-address-input"
                  value={addressText}
                  disabled={isSubmitting}
                  onChange={(e) => handleAddressInputChange(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Nhập số nhà, tên đường, phường/xã để gợi ý hoặc định vị..."
                  className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  required
                />
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                {(isSearching || isGettingPlace) && (
                  <SpinnerIcon className="w-4 h-4 text-amber-500 animate-spin absolute right-3 top-3" />
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in-0 duration-150">
                  {suggestions.map((sug) => (
                    <button
                      key={sug.refId}
                      type="button"
                      onClick={() => handleSelectSuggestion(sug)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-amber-50/70 transition-colors cursor-pointer group"
                    >
                      <p className="text-xs font-semibold text-slate-800 group-hover:text-amber-700">
                        {sug.name || sug.display}
                      </p>
                      {sug.address && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {sug.address}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Map Picker Interactive (Không còn hiển thị tọa độ số) */}
            <VietMapPicker
              latitude={latitude}
              longitude={longitude}
              disabled={isSubmitting}
              onChangeCoordinates={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              onAddressSelect={(revAddress) => {
                // Khi người dùng click hoặc kéo ghim trên bản đồ, cập nhật địa chỉ
                if (revAddress) {
                  setAddressText(revAddress);
                }
              }}
            />
          </div>

          {/* 3. Thời hạn hợp đồng */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              3. Thời hạn hợp đồng
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="contract-start"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Ngày bắt đầu hợp đồng <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="contract-start"
                  value={contractStartDate}
                  disabled={isSubmitting}
                  onChange={(e) => setContractStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="contract-end"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Ngày kết thúc hợp đồng <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="contract-end"
                  value={contractEndDate}
                  disabled={isSubmitting}
                  onChange={(e) => setContractEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* 4. Lịch học theo tuần */}
          <div className="pt-2 border-t border-slate-100">
            <WeeklyScheduleBuilder
              value={weeklySchedule}
              onChange={setWeeklySchedule}
              disabled={isSubmitting}
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#FFCB56] hover:bg-[#e6b74d] text-[#1E293B] text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon className="w-4 h-4 animate-spin text-[#1E293B]" />
                <span>Đang tạo trường học...</span>
              </>
            ) : (
              <span>Tạo trường học</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
