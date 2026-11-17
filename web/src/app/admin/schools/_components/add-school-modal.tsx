'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { vietmapService } from '@/lib/vietmap/vietmap.service';
import type { VietmapSuggestion } from '@/lib/vietmap/types';
import type { WeeklySchedule } from '@/lib/types';
import {
  SearchIcon,
  SpinnerIcon,
  ImageIcon,
  TrashIcon,
  AlertIcon,
  CheckIcon,
} from '@/components/icons';
import {
  WeeklyScheduleBuilder,
  getDayScheduleError,
  getVietnamToday,
  getNextCalendarDay,
  DAYS_OF_WEEK,
} from '@/components/admin/schools/weekly-schedule-builder';
import { VietMapPicker } from '@/components/admin/schools/vietmap-picker';
import { Tooltip } from '@/components/admin/schools/tooltip';
import { SchoolWizardDialog } from '@/components/admin/schools/school-wizard-dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClipboardList, MapPin, School } from 'lucide-react';
import './add-school-modal.css';

interface AddSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SCHOOL_FORM_STEPS = ['Thông tin trường', 'Địa chỉ & vị trí', 'Hợp đồng & lịch học'];

export function AddSchoolModal({
  isOpen,
  onClose,
  onSuccess,
}: AddSchoolModalProps) {
  const [step, setStep] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  // Form fields
  const [name, setName] = useState('');
  const [addressText, setAddressText] = useState('');
  // Internal coordinate state (hidden from UI)
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [contractStartError, setContractStartError] = useState<string | null>(null);
  const [contractEndError, setContractEndError] = useState<string | null>(null);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(1);
      setName('');
      setAddressText('');
      setLatitude(null);
      setLongitude(null);
      setContractStartDate('');
      setContractEndDate('');
      setContractStartError(null);
      setContractEndError(null);
      setWeeklySchedule({});
      setSelectedFile(null);
      clearImagePreview();
      setSuggestions([]);
      setShowSuggestions(false);
      setErrorMessage(null);
    }
  }, [isOpen, clearImagePreview]);

  const todayVn = getVietnamToday();
  const isStartDateValid = Boolean(contractStartDate && contractStartDate >= todayVn);
  const minEndDate = isStartDateValid ? getNextCalendarDay(contractStartDate) : '';

  const handleContractStartDateChange = (newStart: string) => {
    setContractStartDate(newStart);
    setContractStartError(null);
    setContractEndError(null);
    setErrorMessage(null);

    if (!newStart) {
      // Khi xóa ngày bắt đầu, xóa và khóa ngày kết thúc
      setContractEndDate('');
      return;
    }

    const currentToday = getVietnamToday();
    if (newStart < currentToday) {
      setContractStartError('Ngày bắt đầu hợp đồng không thể ở quá khứ.');
      setContractEndDate('');
      return;
    }

    // Khi đổi ngày bắt đầu, giữ ngày kết thúc nếu còn hợp lệ.
    // Nếu mất hiệu lực, xóa giá trị và yêu cầu chọn lại.
    const nextMinEnd = getNextCalendarDay(newStart);
    if (contractEndDate) {
      if (contractEndDate < nextMinEnd) {
        setContractEndDate('');
      }
    }
  };

  const handleContractEndDateChange = (newEnd: string) => {
    setContractEndDate(newEnd);
    setContractEndError(null);
    setErrorMessage(null);

    if (!newEnd) return;

    if (minEndDate && newEnd < minEndDate) {
      setContractEndError('Ngày kết thúc hợp đồng phải sau ngày bắt đầu ít nhất 1 ngày.');
    }
  };

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
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
        console.warn('VietMap autocomplete error:', errorMsg);
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
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
      setErrorMessage(
        'Không thể lấy chi tiết vị trí từ VietMap: ' + errorMsg,
      );
    } finally {
      setIsGettingPlace(false);
    }
  };

  // Submit tạo trường
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setContractStartError(null);
    setContractEndError(null);

    // 1. Validation tên
    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên trường học.');
      goToStep(1, 'school-name');
      return;
    }

    // 2. Validation địa chỉ
    if (!addressText.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ chi tiết của trường học.');
      goToStep(2, 'school-address-input');
      return;
    }

    // 3. Validation tọa độ (chống gửi null hoặc tọa độ giả)
    if (latitude === null || longitude === null) {
      setErrorMessage('Vui lòng chọn vị trí trường trên bản đồ hoặc từ danh sách gợi ý địa chỉ.');
      goToStep(2, 'school-address-input');
      return;
    }

    // 4. Validation hợp đồng
    const currentToday = getVietnamToday();
    if (!contractStartDate) {
      const msg = 'Vui lòng chọn ngày bắt đầu hợp đồng.';
      setErrorMessage(msg);
      setContractStartError(msg);
      goToStep(3, 'contract-start');
      return;
    }

    if (contractStartDate < currentToday) {
      const msg = 'Ngày bắt đầu hợp đồng không thể ở quá khứ (tối thiểu là hôm nay).';
      setErrorMessage(msg);
      setContractStartError(msg);
      goToStep(3, 'contract-start');
      return;
    }

    if (!contractEndDate) {
      const msg = 'Vui lòng chọn ngày kết thúc hợp đồng.';
      setErrorMessage(msg);
      setContractEndError(msg);
      goToStep(3, 'contract-end');
      return;
    }

    const currentMinEnd = getNextCalendarDay(contractStartDate);
    if (contractEndDate < currentMinEnd) {
      const msg = 'Ngày kết thúc hợp đồng phải sau ngày bắt đầu hợp đồng ít nhất 1 ngày.';
      setErrorMessage(msg);
      setContractEndError(msg);
      goToStep(3, 'contract-end');
      return;
    }

    // 5. Validation lịch học tuần
    const activeDays = Object.entries(weeklySchedule).filter(
      ([, val]) => val !== undefined && val !== null,
    );
    if (activeDays.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một ngày học trong tuần.');
      goToStep(3, 'day-monday');
      return;
    }

    for (const [dayKey, dayVal] of activeDays) {
      const dayErr = getDayScheduleError(dayVal);
      if (dayErr) {
        const dayLabel = DAYS_OF_WEEK.find((d) => d.key === dayKey)?.label || dayKey;
        setErrorMessage(`${dayLabel}: ${dayErr}`);
        goToStep(3, `${dayKey}-end`);
        return;
      }
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
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : null;
      setErrorMessage(
        errorMsg ||
          'Không thể tạo trường học. Vui lòng kiểm tra lại thông tin và thử lại.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToStep = (nextStep: number, focusTargetId?: string) => {
    setStep(nextStep);
    setTimeout(() => {
      if (focusTargetId) {
        const el = document.getElementById(focusTargetId);
        if (el) {
          el.focus();
          return;
        }
      }
      formRef.current?.scrollTo({ top: 0 });
      formRef.current?.focus({ preventScroll: true });
    }, 50);
  };

  const handleWizardSubmit = (event: React.FormEvent) => {
    if (step < SCHOOL_FORM_STEPS.length) {
      event.preventDefault();
      goToStep(step + 1);
      return;
    }
    void handleSubmit(event);
  };

  if (!isOpen) return null;

  const hasLocation = latitude !== null && longitude !== null;

  return (
    <SchoolWizardDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm trường học mới"
      description="Nhập thông tin cơ bản, vị trí địa lý và cấu hình lịch học"
      titleId="modal-add-school-title"
      step={step}
      steps={SCHOOL_FORM_STEPS}
      onStepChange={goToStep}
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
      onSubmit={handleWizardSubmit}
      formRef={formRef}
      footer={
        <>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            Hủy bỏ
          </Button>
          <div className="school-wizard-footer-actions">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goToStep(step - 1)}
                disabled={isSubmitting}
              >
                Quay lại
              </Button>
            )}
            {step < SCHOOL_FORM_STEPS.length ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => goToStep(step + 1)}
                disabled={isSubmitting}
              >
                Tiếp tục
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleWizardSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-[#e6b74d] text-foreground text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <SpinnerIcon className="w-4 h-4 animate-spin text-foreground" />
                    <span>Đang tạo trường học...</span>
                  </>
                ) : (
                  <span>Tạo trường học</span>
                )}
              </Button>
            )}
          </div>
        </>
      }
    >
      {/* 1. Thông tin chung */}
          <fieldset id="school-wizard-panel-1" className="school-wizard-panel" hidden={step !== 1} disabled={isSubmitting || step !== 1} aria-label={SCHOOL_FORM_STEPS[0]}>
          <div className="school-wizard-section school-wizard-basics space-y-4">
            <h3 className="school-wizard-section-title text-xs font-bold uppercase tracking-wider text-slate-400">
              <School size={18} aria-hidden="true" />Thông tin cơ bản
            </h3>

            <div>
              <label
                htmlFor="school-name"
                className="block text-sm font-semibold text-slate-800 mb-1"
              >
                Tên trường học <span className="text-red-500">*</span>
              </label>
              <Input
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
                <label htmlFor="school-image" className="text-sm font-semibold text-slate-800">
                  Ảnh trường học
                </label>
                <Tooltip content="Ảnh đại diện giúp phụ huynh và quản trị viên dễ dàng nhận diện trường. Hỗ trợ JPEG, PNG, WebP tối đa 5MB." />
              </div>

              <Input
                ref={fileInputRef}
                type="file"
                id="school-image"
                accept="image/jpeg,image/png,image/webp"
                disabled={isSubmitting}
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="school-wizard-image">
                <div className="school-wizard-image-preview">
                  {imagePreviewUrl ? (
                    <img
                      src={imagePreviewUrl}
                      alt="Xem trước ảnh trường"
                    />
                  ) : (
                    <div className="school-wizard-image-placeholder" aria-hidden="true">
                      <School size={40} strokeWidth={1.5} />
                      <span>Ảnh trường học</span>
                    </div>
                  )}
                </div>
                <div className="school-wizard-image-content">
                  <p className="school-wizard-image-name" title={selectedFile?.name}>
                    {selectedFile?.name || 'Ảnh đại diện trường'}
                  </p>
                  {selectedFile ? (
                    <p className="school-wizard-image-meta">
                      {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  ) : (
                    <p className="school-wizard-image-meta">JPEG, PNG, WebP · Tối đa 5 MB</p>
                  )}
                  <div className="school-wizard-image-actions">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                    >
                      <ImageIcon className="w-4 h-4" aria-hidden="true" />
                      <span>{imagePreviewUrl ? 'Đổi ảnh' : 'Chọn ảnh'}</span>
                    </Button>
                    {imagePreviewUrl && (
                    <Button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={isSubmitting}
                      variant="ghost"
                      className="school-wizard-image-remove"
                    >
                      <TrashIcon className="w-4 h-4" aria-hidden="true" />
                      <span>Xóa ảnh</span>
                    </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          </fieldset>

          {/* 2. Địa chỉ & Vị trí */}
          <fieldset id="school-wizard-panel-2" className="school-wizard-panel" hidden={step !== 2} disabled={isSubmitting || step !== 2} aria-label={SCHOOL_FORM_STEPS[1]}>
          <div className="school-wizard-section school-wizard-location space-y-4 pt-2 border-t border-slate-100">
            <h3 className="school-wizard-section-title text-xs font-bold uppercase tracking-wider text-slate-400">
              <MapPin size={18} aria-hidden="true" />Địa chỉ & Vị trí
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
                <Input
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
                <Card className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in-0 duration-150">
                  {suggestions.map((sug) => (
                    <Button
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
                    </Button>
                  ))}
                </Card>
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
          </fieldset>

          {/* 3. Hợp đồng và lịch học */}
          <fieldset id="school-wizard-panel-3" className="school-wizard-panel" hidden={step !== 3} disabled={isSubmitting || step !== 3} aria-label={SCHOOL_FORM_STEPS[2]}>
          <div className="school-wizard-section space-y-4">
            <h3 className="school-wizard-section-title text-xs font-bold uppercase tracking-wider text-slate-400">
              <ClipboardList size={20} aria-hidden="true" />Thời hạn hợp đồng
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="contract-start"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Ngày bắt đầu hợp đồng <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  id="contract-start"
                  value={contractStartDate}
                  min={todayVn}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(contractStartError)}
                  aria-describedby={contractStartError ? 'contract-start-error' : undefined}
                  onChange={(e) => handleContractStartDateChange(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border bg-white text-slate-800 focus:outline-none focus:ring-2 ${
                    contractStartError
                      ? 'border-rose-400 focus:ring-rose-400'
                      : 'border-slate-200 focus:ring-amber-400'
                  }`}
                  required
                />
                {contractStartError && (
                  <p
                    id="contract-start-error"
                    role="alert"
                    className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium"
                  >
                    <AlertIcon className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>{contractStartError}</span>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="contract-end"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Ngày kết thúc hợp đồng <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  id="contract-end"
                  value={contractEndDate}
                  min={minEndDate || undefined}
                  disabled={!isStartDateValid || isSubmitting}
                  aria-invalid={Boolean(contractEndError)}
                  aria-describedby={
                    !isStartDateValid
                      ? 'contract-end-hint'
                      : contractEndError
                        ? 'contract-end-error'
                        : undefined
                  }
                  onChange={(e) => handleContractEndDateChange(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border bg-white text-slate-800 focus:outline-none focus:ring-2 ${
                    contractEndError
                      ? 'border-rose-400 focus:ring-rose-400'
                      : 'border-slate-200 focus:ring-amber-400'
                  } disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed`}
                  required
                />
                {!isStartDateValid ? (
                  <p id="contract-end-hint" className="text-[11px] text-slate-500 mt-1">
                    Chọn ngày bắt đầu trước
                  </p>
                ) : contractEndError ? (
                  <p
                    id="contract-end-error"
                    role="alert"
                    className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium"
                  >
                    <AlertIcon className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>{contractEndError}</span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
            <WeeklyScheduleBuilder
              layout="table"
              value={weeklySchedule}
              onChange={setWeeklySchedule}
              disabled={isSubmitting}
            />
          </fieldset>
    </SchoolWizardDialog>
  );
}
