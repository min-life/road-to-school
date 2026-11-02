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
} from '@/components/admin/schools/weekly-schedule-builder';
import { VietMapPicker } from '@/components/admin/schools/vietmap-picker';
import { Tooltip } from '@/components/admin/schools/tooltip';
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
      setStep(1);
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

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    requestAnimationFrame(() => {
      formRef.current?.scrollTo({ top: 0 });
      formRef.current?.focus({ preventScroll: true });
    });
  };

  const handleWizardSubmit = (event: React.FormEvent) => {
    if (step < SCHOOL_FORM_STEPS.length) {
      event.preventDefault();
      goToStep(step + 1);
      return;
    }
    // Reveal the section containing the existing validation error.
    // handleSubmit remains the sole validator and API submission handler.
    if (!name.trim()) {
      goToStep(1);
    } else if (!addressText.trim() || latitude === null || longitude === null) {
      goToStep(2);
    }
    void handleSubmit(event);
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
      <Card className="school-wizard-dialog ui-dialog-panel ui-dialog-panel-body relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl z-10 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="school-wizard-header flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
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
          <Button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng biểu mẫu"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </Button>
        </div>

        <nav className="school-wizard-navigation" aria-label="Các bước thêm trường học">
          <ol>{SCHOOL_FORM_STEPS.map((label, index) => <li key={label}>
            <button type="button" aria-current={step === index + 1 ? 'step' : undefined}
              aria-controls={`school-wizard-panel-${index + 1}`} disabled={isSubmitting} onClick={() => goToStep(index + 1)}>
              <span className="school-wizard-step-number" aria-hidden="true">{index + 1}</span>
              <span>{label}</span>
            </button>
          </li>)}</ol>
        </nav>

        {/* Inactive sections stay mounted to preserve image/map/form state. */}
        <form ref={formRef} onSubmit={handleWizardSubmit} tabIndex={-1} aria-label={`Bước ${step}: ${SCHOOL_FORM_STEPS[step - 1]}`} className="school-wizard-form ui-dialog-body flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
              <AlertIcon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

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
                <Input
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
            <WeeklyScheduleBuilder
              layout="table"
              value={weeklySchedule}
              onChange={setWeeklySchedule}
              disabled={isSubmitting}
            />
          </fieldset>
        </form>

        {/* Footer Actions */}
        <div className="school-wizard-footer flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <Button variant="outline" size="sm"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            Hủy bỏ
          </Button>
          <div className="school-wizard-footer-actions">
          {step > 1 && <Button type="button" variant="outline" size="sm" onClick={() => goToStep(step - 1)} disabled={isSubmitting}>Quay lại</Button>}
          {step < SCHOOL_FORM_STEPS.length ? <Button type="button" variant="primary" size="sm" onClick={() => goToStep(step + 1)} disabled={isSubmitting}>Tiếp tục</Button> :
          <Button variant="primary" size="sm"
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
          </Button>}
          </div>
        </div>
      </Card>
    </div>
  );
}
