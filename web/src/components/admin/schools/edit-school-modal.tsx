'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { vietmapService } from '@/lib/vietmap/vietmap.service';
import type { VietmapSuggestion } from '@/lib/vietmap/types';
import type {
  SchoolDetail,
  WeeklySchedule,
  SchoolLocationImpactResponse,
} from '@/lib/types';
import {
  SearchIcon,
  SpinnerIcon,
  AlertIcon,
  CheckIcon,
  ImageIcon,
  TrashIcon,
} from '@/components/icons';
import {
  WeeklyScheduleBuilder,
  getNextCalendarDay,
} from '@/components/admin/schools/weekly-schedule-builder';
import { VietMapPicker } from '@/components/admin/schools/vietmap-picker';
import { Tooltip } from '@/components/admin/schools/tooltip';
import { SchoolWizardDialog } from '@/components/admin/schools/school-wizard-dialog';
import { SchoolEffectiveDateField } from '@/components/admin/schools/school-effective-date-field';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { displayDate, vietnamDate } from '@/lib/school-lifecycle';
import { ClipboardList, MapPin, School } from 'lucide-react';
import {
  createSchoolEditBaseline,
  detectSchoolChanges,
  resolveSchoolEditEffectiveDate,
  schoolEditEffectiveDateLimit,
  validateSchoolEditForm,
  type SchoolEditBaseline,
  type SchoolEditCurrentDraft,
} from './school-edit.helper';

export interface EditSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message?: string, partial?: boolean) => void;
  school: SchoolDetail;
  userRole?: string;
  readOnlyBasicInfo?: boolean;
}

const SCHOOL_LOCATION_DATE_ID = 'school-location-effective-date';
const SCHOOL_FORM_STEPS = [
  'Thông tin trường',
  'Địa chỉ & vị trí',
  'Hợp đồng & lịch học',
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function EditSchoolModal({
  isOpen,
  onClose,
  onSuccess,
  school,
  userRole,
}: EditSchoolModalProps) {
  const [step, setStep] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);

  // Baseline state snapshot
  const [baseline, setBaseline] = useState<SchoolEditBaseline | null>(null);

  // Form field states
  const [name, setName] = useState(school.name || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [addressText, setAddressText] = useState(school.addressText || '');
  const [latitude, setLatitude] = useState<number | null>(school.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(school.longitude ?? null);
  const [contractStartDate, setContractStartDate] = useState(
    school.contractStartDate ? school.contractStartDate.slice(0, 10) : '',
  );
  const [contractEndDate, setContractEndDate] = useState(
    school.contractEndDate ? school.contractEndDate.slice(0, 10) : '',
  );
  const [contractStartError, setContractStartError] = useState<string | null>(null);
  const [contractEndError, setContractEndError] = useState<string | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(
    school.weeklySchedule || {},
  );
  const [effectiveDate, setEffectiveDate] = useState('');

  // VietMap search autocomplete state
  const [suggestions, setSuggestions] = useState<VietmapSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingPlace, setIsGettingPlace] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Location Impact modal state
  const [locationImpact, setLocationImpact] =
    useState<SchoolLocationImpactResponse | null>(null);
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

  // Reset form when modal opens or school ID changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      if (!baseline || baseline.id !== school.id) {
        const base = createSchoolEditBaseline(school);
        setBaseline(base);

        setName(base.name);
        setSelectedFile(null);
        clearImagePreview();
        setAddressText(base.addressText);
        setLatitude(base.latitude);
        setLongitude(base.longitude);
        setContractStartDate(base.contractStartDate);
        setContractEndDate(base.contractEndDate);
        setWeeklySchedule(school.weeklySchedule || {});
        setEffectiveDate('');
        setStep(1);
        setErrorMessage(null);
        setContractStartError(null);
        setContractEndError(null);
        setIsImpactModalOpen(false);
        setLocationImpact(null);
        setRelocateReason('');
        setRelocateReasonError(null);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setBaseline(null);
      setSelectedFile(null);
      clearImagePreview();
      setShowSuggestions(false);
      setSuggestions([]);
      setIsImpactModalOpen(false);
      setLocationImpact(null);
      setErrorMessage(null);
    }
  }, [isOpen, school, baseline, clearImagePreview]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Clean up search timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Compute normalized change detection against stable baseline
  const currentDraft: SchoolEditCurrentDraft = {
    name,
    selectedFile,
    addressText,
    latitude,
    longitude,
    contractStartDate,
    contractEndDate,
    weeklySchedule,
  };

  const changes = detectSchoolChanges(baseline, currentDraft);
  const {
    isProfileChanged,
    isNameChanged,
    isLocationChanged,
    isScheduleChanged,
    isContractChanged,
    hasChanges,
  } = changes;
  const changeEffectiveDate = resolveSchoolEditEffectiveDate(effectiveDate, isLocationChanged);
  const effectiveDateLimit = schoolEditEffectiveDateLimit(contractEndDate, school.contractEndDate);

  const formValidation = validateSchoolEditForm(
    currentDraft,
    changes,
    effectiveDate,
    userRole,
    school.contractEndDate,
  );
  const isFormValid = formValidation.valid;
  const canSave =
    hasChanges && isFormValid && userRole === 'SYSTEM_ADMIN' && !isSubmitting;

  const minEndDate = contractStartDate
    ? getNextCalendarDay(contractStartDate)
    : '';

  const handleContractStartDateChange = (newStart: string) => {
    setContractStartDate(newStart);
    setContractStartError(null);
    setContractEndError(null);
    setErrorMessage(null);

    if (!newStart) {
      setContractEndDate('');
      return;
    }

    const nextMinEnd = getNextCalendarDay(newStart);
    if (contractEndDate && contractEndDate < nextMinEnd) {
      setContractEndDate('');
    }
  };

  const handleContractEndDateChange = (newEnd: string) => {
    setContractEndDate(newEnd);
    setContractEndError(null);
    setErrorMessage(null);

    if (!newEnd) return;

    if (minEndDate && newEnd < minEndDate) {
      setContractEndError(
        'Ngày kết thúc hợp đồng phải sau ngày bắt đầu ít nhất 1 ngày.',
      );
    }
  };

  // Image file change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrorMessage(
        'Định dạng ảnh không hợp lệ. Vui lòng chọn ảnh định dạng JPEG, PNG hoặc WebP.',
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrorMessage(
        'Kích thước ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn 5MB.',
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    clearImagePreview();
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setImagePreviewUrl(url);
  };

  const handleRemoveSelectedFile = () => {
    clearImagePreview();
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Debounced address search
  const handleAddressInputChange = (val: string) => {
    setAddressText(val);
    setErrorMessage(null);

    // Invalidate coordinates if address is manually altered to prevent mismatch
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
        const errorMsg =
          err instanceof Error ? err.message : 'Lỗi không xác định';
        console.warn('VietMap autocomplete error:', errorMsg);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelectSuggestion = async (suggestion: VietmapSuggestion) => {
    setShowSuggestions(false);
    const displayAddr =
      suggestion.display || suggestion.address || suggestion.name;
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
      const errorMsg =
        err instanceof Error ? err.message : 'Lỗi không xác định';
      setErrorMessage(
        'Không thể lấy chi tiết vị trí từ VietMap: ' + errorMsg,
      );
    } finally {
      setIsGettingPlace(false);
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

  const executeSave = useCallback(
    async (reason?: string, fingerprint?: { location?: string; schedule?: string }) => {
      if (isSubmitting) return;

      const date = changeEffectiveDate;
      const messages: string[] = [];

      try {
        setIsSubmitting(true);
        setErrorMessage(null);

        // 1. Update basic profile (name and/or image) if changed
        if (isProfileChanged) {
          const profileForm = new FormData();
          if (isNameChanged) {
            profileForm.append('name', name.trim());
          }
          if (selectedFile) {
            profileForm.append('image', selectedFile);
          }
          const profileRes = await apiClient.updateSchoolProfile(
            school.id,
            profileForm,
          );
          if (profileRes) {
            messages.push('Cập nhật tên và ảnh trường thành công.');
          }
        }

        // 2. Update location if changed
        if (isLocationChanged) {
          const locRes = await apiClient.updateSchoolLocation(school.id, {
            addressText: addressText.trim(),
            latitude: latitude!,
            longitude: longitude!,
            reason,
            expectedFingerprint: fingerprint?.location,
            effectiveDate: date,
          });
          if (locRes?.message) {
            messages.push(
              locRes.changeStatus === 'PENDING'
                ? `Đã hẹn đổi vị trí từ ${displayDate(locRes.effectiveDate || date)}.`
                : locRes.message,
            );
          }
        }

        // 3. Update weekly schedule if changed
        if (isScheduleChanged) {
          const schedRes = await apiClient.updateSchoolSchedule(
            school.id,
            weeklySchedule,
            date,
            fingerprint?.schedule,
          );
          if (schedRes?.message) {
            messages.push(
              schedRes.changeStatus === 'PENDING'
                ? `Đã hẹn đổi lịch học từ ${displayDate(schedRes.effectiveDate || date)}.`
                : schedRes.message,
            );
          }
        }

        // 4. Update contract if changed
        if (isContractChanged && userRole === 'SYSTEM_ADMIN') {
          const contractRes = await apiClient.updateSchoolContract(school.id, {
            contractStartDate,
            contractEndDate,
          });
          if (contractRes?.message) {
            messages.push(contractRes.message);
          }
        }

        setIsImpactModalOpen(false);
        onSuccess(messages.join(' '));
        onClose();
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
        if (messages.length > 0) {
          // Partial save
          setIsImpactModalOpen(false);
          onSuccess(
            `${messages.join(' ')} Phần còn lại chưa lưu: ${errMsg}. Kiểm tra lịch hẹn trước khi gửi lại.`,
            true,
          );
          onClose();
        } else {
          setErrorMessage(errMsg || 'Cập nhật trường học thất bại.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isSubmitting,
      changeEffectiveDate,
      isProfileChanged,
      isNameChanged,
      name,
      selectedFile,
      school.id,
      isLocationChanged,
      addressText,
      latitude,
      longitude,
      isScheduleChanged,
      weeklySchedule,
      isContractChanged,
      userRole,
      contractStartDate,
      contractEndDate,
      onSuccess,
      onClose,
    ],
  );

  const handleSaveRequest = async () => {
    setErrorMessage(null);

    if (userRole !== 'SYSTEM_ADMIN') {
      setErrorMessage(
        'Chỉ Quản trị viên hệ thống (SYSTEM_ADMIN) mới có quyền chỉnh sửa thông tin trường học.',
      );
      return;
    }

    if (!hasChanges) {
      return;
    }

    const validation = validateSchoolEditForm(
      currentDraft,
      changes,
      effectiveDate,
      userRole,
      school.contractEndDate,
    );
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Dữ liệu không hợp lệ.');
      if (validation.stepTarget) {
        goToStep(validation.stepTarget);
      }
      return;
    }

    if (isLocationChanged || isScheduleChanged) {
      try {
        setIsSubmitting(true);
        const date = changeEffectiveDate;
        const location = isLocationChanged
          ? await apiClient.getSchoolLocationImpact(school.id, latitude!, longitude!, date)
          : null;
        const impact = isScheduleChanged && !location?.hasCoordinateChanged
          ? await apiClient.getSchoolScheduleImpact(school.id, weeklySchedule, date)
          : location;
        if (impact) {
          setLocationImpact(impact);
          setRelocateReason(
            `Thay đổi địa chỉ trường sang ${addressText.trim()}`,
          );
          setRelocateReasonError(null);
          setIsImpactModalOpen(true);
          setIsSubmitting(false);
          return;
        }
      } catch (err: unknown) {
        const errMsg =
          err instanceof Error
            ? err.message
            : 'Không thể kiểm tra tác động thay đổi trường';
        setErrorMessage(errMsg);
        setIsSubmitting(false);
        return;
      }
    }

    await executeSave();
  };

  const handleConfirmRelocate = async () => {
    if (locationImpact?.hasCoordinateChanged && !relocateReason.trim()) {
      setRelocateReasonError(
        'Vui lòng nhập lý do thay đổi vị trí trường (bắt buộc)',
      );
      return;
    }
    setRelocateReasonError(null);
    await executeSave(
      relocateReason.trim(),
      locationImpact?.hasCoordinateChanged || !isScheduleChanged
        ? { location: locationImpact?.expectedFingerprint }
        : { schedule: locationImpact?.expectedFingerprint },
    );
  };

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (canSave) {
      void handleSaveRequest();
    } else if (step < SCHOOL_FORM_STEPS.length) {
      goToStep(step + 1);
    }
  };

  if (!isOpen) return null;

  const hasLocation = latitude !== null && longitude !== null;

  return (
    <>
      <SchoolWizardDialog
        isOpen={isOpen}
        onClose={onClose}
        title="Chỉnh sửa thông tin trường học"
        description="Cập nhật thông tin, vị trí địa lý và lịch học của trường"
        titleId="modal-edit-school-title"
        step={step}
        steps={SCHOOL_FORM_STEPS}
        onStepChange={goToStep}
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        onSubmit={handleFormSubmit}
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
              {step < SCHOOL_FORM_STEPS.length && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => goToStep(step + 1)}
                  disabled={isSubmitting}
                >
                  Tiếp tục
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleSaveRequest}
                disabled={!canSave || isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-[#e6b74d] text-foreground text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <SpinnerIcon className="w-4 h-4 animate-spin text-foreground" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Lưu thay đổi</span>
                )}
              </Button>
            </div>
          </>
        }
      >
        {/* 1. Thông tin trường (Tên & Ảnh) */}
        <fieldset
          id="school-wizard-panel-1"
          className="school-wizard-panel"
          hidden={step !== 1}
          disabled={isSubmitting || step !== 1}
          aria-label={SCHOOL_FORM_STEPS[0]}
        >
          <div className="school-wizard-section school-wizard-basics space-y-4">
            <h3 className="school-wizard-section-title text-xs font-bold uppercase tracking-wider text-slate-400">
              <School size={18} aria-hidden="true" />
              <span>Thông tin cơ bản</span>
            </h3>

            {/* Tên trường học */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label
                  htmlFor="school-edit-name"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Tên trường học <span className="text-red-500">*</span>
                </label>
                <Tooltip content="Tên trường học đối tác (tối thiểu 2 ký tự)." />
              </div>
              <Input
                id="school-edit-name"
                type="text"
                value={name}
                disabled={isSubmitting}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Ví dụ: Trường Tiểu học Lê Quý Đôn"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-800"
                required
              />
            </div>

            {/* Ảnh đại diện trường học */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-sm font-semibold text-slate-800">
                  Ảnh trường học
                </label>
                <Tooltip content="Ảnh đại diện giúp nhận diện trường. Hỗ trợ JPEG, PNG, WebP tối đa 5MB." />
              </div>

              <Input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isSubmitting}
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="school-wizard-image">
                <div className="school-wizard-image-preview">
                  {imagePreviewUrl || school.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={imagePreviewUrl || school.imageUrl || ''}
                      alt="Xem trước ảnh trường"
                    />
                  ) : (
                    <div
                      className="school-wizard-image-placeholder"
                      aria-hidden="true"
                    >
                      <School size={40} strokeWidth={1.5} />
                      <span>Ảnh trường học</span>
                    </div>
                  )}
                </div>
                <div className="school-wizard-image-content">
                  <p
                    className="school-wizard-image-name"
                    title={selectedFile?.name || school.name}
                  >
                    {selectedFile?.name ||
                      (school.imageUrl
                        ? 'Ảnh hiện tại của trường'
                        : 'Chưa có ảnh đại diện')}
                  </p>
                  {selectedFile ? (
                    <p className="school-wizard-image-meta">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Ảnh mới
                      đã chọn
                    </p>
                  ) : (
                    <p className="school-wizard-image-meta">
                      JPEG, PNG, WebP · Tối đa 5 MB
                    </p>
                  )}
                  <div className="school-wizard-image-actions">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                    >
                      <ImageIcon className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {selectedFile || school.imageUrl
                          ? 'Thay ảnh'
                          : 'Chọn ảnh'}
                      </span>
                    </Button>
                    {selectedFile && (
                      <Button
                        type="button"
                        onClick={handleRemoveSelectedFile}
                        disabled={isSubmitting}
                        variant="ghost"
                        className="school-wizard-image-remove"
                      >
                        <TrashIcon className="w-4 h-4" aria-hidden="true" />
                        <span>Hủy ảnh vừa chọn</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </fieldset>

        {/* 2. Địa chỉ & Vị trí */}
        <fieldset
          id="school-wizard-panel-2"
          className="school-wizard-panel"
          hidden={step !== 2}
          disabled={isSubmitting || step !== 2}
          aria-label={SCHOOL_FORM_STEPS[1]}
        >
          <div className="school-wizard-section school-wizard-location space-y-4 pt-2 border-t border-slate-100">
            <h3 className="school-wizard-section-title text-xs font-bold uppercase tracking-wider text-slate-400">
              <MapPin size={18} aria-hidden="true" />
              <span>Địa chỉ & Vị trí</span>
            </h3>

            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="school-edit-address-input"
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
                  id="school-edit-address-input"
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

            {step === 2 && isLocationChanged && (
              <SchoolEffectiveDateField id={SCHOOL_LOCATION_DATE_ID} label="Ngày áp dụng địa điểm"
                value={changeEffectiveDate} max={effectiveDateLimit} disabled={isSubmitting} onChange={setEffectiveDate} />
            )}

            {/* Map Picker Interactive */}
            <VietMapPicker
              markerKind="school"
              latitude={latitude}
              longitude={longitude}
              disabled={isSubmitting}
              onChangeCoordinates={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              onAddressSelect={(revAddress) => {
                if (revAddress) {
                  setAddressText(revAddress);
                }
              }}
            />
          </div>
        </fieldset>

        {/* 3. Hợp đồng & Lịch học */}
        <fieldset
          id="school-wizard-panel-3"
          className="school-wizard-panel space-y-4"
          hidden={step !== 3}
          disabled={isSubmitting || step !== 3}
          aria-label={SCHOOL_FORM_STEPS[2]}
        >
          {/* Thời hạn hợp đồng */}
          <div className="school-wizard-section space-y-4">
            <h3 className="school-wizard-section-title text-xs font-bold uppercase tracking-wider text-slate-400">
              <ClipboardList size={20} aria-hidden="true" />
              <span>Thời hạn hợp đồng</span>
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
                  aria-invalid={Boolean(contractStartError)}
                  aria-describedby={
                    contractStartError ? 'contract-start-error' : undefined
                  }
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
                  min={minEndDate}
                  disabled={isSubmitting || !contractStartDate}
                  aria-invalid={Boolean(contractEndError)}
                  aria-describedby={
                    !contractStartDate
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
                {!contractStartDate ? (
                  <p
                    id="contract-end-hint"
                    className="text-[11px] text-slate-500 mt-1"
                  >
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

            <p className="text-[11px] text-slate-500">
              Nếu còn phương án chưa duyệt/đang hoạt động, giữ ngày bắt đầu và
              chỉ gia hạn ngày kết thúc. Hệ thống kiểm tra nguồn lực khi lưu;
              không khôi phục phương án đã hủy.
            </p>
          </div>

          <WeeklyScheduleBuilder
            layout="table"
            value={weeklySchedule}
            onChange={setWeeklySchedule}
            disabled={isSubmitting}
            belowHeading={step === 3 && isScheduleChanged ? isLocationChanged ? (
              <div className="school-effective-date-row">
                <div>
                  <span className="school-effective-date-label">Ngày áp dụng lịch học</span>
                  <p className="school-effective-date-note">Cùng ngày với thay đổi địa điểm</p>
                </div>
                <div className="school-effective-date-actions">
                  <span className="school-effective-date-value">{displayDate(changeEffectiveDate)}</span>
                  <button type="button" className="school-effective-date-link" disabled={isSubmitting}
                    onClick={() => goToStep(2, SCHOOL_LOCATION_DATE_ID)}>Sửa ngày</button>
                </div>
              </div>
            ) : (
              <SchoolEffectiveDateField id="school-schedule-effective-date" label="Ngày áp dụng lịch học"
                value={changeEffectiveDate} max={effectiveDateLimit} disabled={isSubmitting} onChange={setEffectiveDate} />
            ) : undefined}
          />
        </fieldset>
      </SchoolWizardDialog>

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
                  Xác nhận thay đổi thông tin vận hành
                </h3>
                <p className="text-xs text-slate-500">
                  Áp dụng từ {displayDate(changeEffectiveDate)}. Các chuyến đã sẵn sàng, điểm danh hoặc đang chạy dùng dữ liệu cũ.
                </p>
              </div>
            </div>

            {/* Thống kê tác động */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span>Phương án cần tối ưu lại</span>
                <span className="font-bold text-rose-600">
                  {locationImpact.reoptimizationPlansCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Chuyến chưa vận hành dự kiến hủy</span>
                <span className="font-bold text-rose-600">
                  {locationImpact.cancelledTripsCount} ({locationImpact.cancelledTripsTodayCount} hôm nay)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Chuyến dự kiến cập nhật giờ</span>
                <span className="font-semibold">{locationImpact.updatedTripsCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Chuyến đã vào quy trình vận hành được giữ</span>
                <span className="font-bold text-emerald-600">
                  {locationImpact.preservedTripsCount}
                </span>
              </div>
            </div>

            {/* Lý do thay đổi */}
            {locationImpact.hasCoordinateChanged && <div className="space-y-1.5">
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
                <p className="text-xs text-rose-600 font-medium">
                  {relocateReasonError}
                </p>
              )}
            </div>}

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
                variant="primary"
              >
                {isSubmitting && (
                  <SpinnerIcon className="w-4 h-4 animate-spin" />
                )}
                <span>{changeEffectiveDate === vietnamDate() ? 'Áp dụng hôm nay' : 'Đặt lịch thay đổi'}</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
