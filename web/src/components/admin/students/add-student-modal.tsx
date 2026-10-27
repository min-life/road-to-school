'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { vietmapService } from '@/lib/vietmap/vietmap.service';
import type { VietmapSuggestion } from '@/lib/vietmap/types';
import type { StudentListItem } from '@/lib/types';
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
import { VietMapPicker } from '@/components/admin/schools/vietmap-picker';
import { Tooltip } from '@/components/admin/schools/tooltip';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddStudentModalProps {
  isOpen: boolean;
  schoolId: string;
  onClose: () => void;
  onSuccess: (newStudent: StudentListItem) => void;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function AddStudentModal({
  isOpen,
  schoolId,
  onClose,
  onSuccess,
}: AddStudentModalProps) {
  // Form fields
  const [fullName, setFullName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [addressText, setAddressText] = useState('');
  // Internal coordinate state (hidden from UI)
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Avatar handling
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

  // Reset form when modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      setFullName('');
      setGuardianPhone('');
      setAddressText('');
      setLatitude(null);
      setLongitude(null);
      setSelectedFile(null);
      clearImagePreview();
      setSuggestions([]);
      setShowSuggestions(false);
      setErrorMessage(null);
    }
  }, [isOpen, clearImagePreview]);

  // Handle avatar file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrorMessage('Định dạng ảnh không hợp lệ. Vui lòng chọn ảnh JPEG, PNG hoặc WebP.');
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

  // VietMap Autocomplete search debouncing
  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAddressText(val);

    // If user clears the text, reset coordinates as well
    if (!val.trim()) {
      setLatitude(null);
      setLongitude(null);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await vietmapService.autocomplete(val.trim());
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (err: any) {
        console.warn('VietMap Autocomplete error:', err?.message);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // Handle selecting an autocomplete suggestion
  const handleSelectSuggestion = async (suggestion: VietmapSuggestion) => {
    setShowSuggestions(false);
    setIsGettingPlace(true);
    setErrorMessage(null);

    try {
      const details = await vietmapService.getPlaceDetail(suggestion.refId);
      if (details) {
        setAddressText(details.addressText);
        setLatitude(details.latitude);
        setLongitude(details.longitude);
      } else {
        setAddressText(suggestion.display);
      }
    } catch (err: any) {
      console.warn('VietMap Place details error:', err?.message);
      setAddressText(suggestion.display);
    } finally {
      setIsGettingPlace(false);
    }
  };

  // Coordinate change from map marker drag/click
  const handleChangeCoordinates = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  // Clear address if user decides not to specify one
  const handleClearAddress = () => {
    setAddressText('');
    setLatitude(null);
    setLongitude(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = guardianPhone.trim();

    if (!trimmedName) {
      setErrorMessage('Vui lòng nhập họ và tên học sinh.');
      return;
    }

    if (!trimmedPhone) {
      setErrorMessage('Vui lòng nhập số điện thoại phụ huynh.');
      return;
    }

    // Phone validation
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      setErrorMessage('Số điện thoại phụ huynh không hợp lệ. Vui lòng nhập 10-11 chữ số.');
      return;
    }

    // Address validation: if address text is filled, must have valid coordinates
    if (addressText.trim() && (latitude === null || longitude === null)) {
      setErrorMessage(
        'Vui lòng chọn địa điểm từ gợi ý hoặc nhấp trên bản đồ để xác định tọa độ chính xác.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('fullName', trimmedName);
      formData.append('guardianPhone', trimmedPhone);

      if (addressText.trim() && latitude !== null && longitude !== null) {
        formData.append('addressText', addressText.trim());
        formData.append('latitude', String(latitude));
        formData.append('longitude', String(longitude));
      }

      if (selectedFile) {
        formData.append('avatar', selectedFile);
      }

      const newStudent = await apiClient.createStudent(schoolId, formData);
      onSuccess(newStudent);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể tạo học sinh. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <Card
        className="ui-dialog-panel bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-student-title"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 id="add-student-title" className="text-lg font-bold text-slate-900">
              Thêm học sinh mới
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mã học sinh và trạng thái Khả dụng sẽ được tự động tạo bởi hệ thống.
            </p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <CloseIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error banner */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl">
              <AlertIcon className="w-4 h-4 text-red-600 flex-shrink-0" />
              <div className="flex-1 text-xs">{errorMessage}</div>
            </div>
          )}

          {/* Student Name & Guardian Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Họ và tên học sinh <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn An"
                disabled={isSubmitting}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:bg-slate-100"
                required
              />
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Số điện thoại phụ huynh <span className="text-red-500">*</span>
                </label>
                <Tooltip content="Số điện thoại nhận mã OTP khi phụ huynh liên kết học sinh trên ứng dụng di động." />
              </div>
              <Input
                type="tel"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="Ví dụ: 0912345678"
                disabled={isSubmitting}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:bg-slate-100"
                required
              />
            </div>
          </div>

          {/* Avatar Upload (Optional) */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Ảnh đại diện (Tùy chọn)
              </label>
              <Tooltip content="Định dạng JPEG, PNG hoặc WebP. Kích thước tối đa 5MB." />
            </div>

            <div className="flex items-center gap-4">
              {imagePreviewUrl ? (
                <div className="relative group w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400 flex-shrink-0">
                  <img
                    src={imagePreviewUrl}
                    alt="Xem trước ảnh học sinh"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={isSubmitting}
                    className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Xóa ảnh"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}

              <div className="space-y-1">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="hidden"
                  id="student-avatar-input"
                />
                <label
                  htmlFor="student-avatar-input"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{imagePreviewUrl ? 'Thay đổi ảnh' : 'Chọn ảnh'}</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Ảnh đại diện sẽ hiển thị trên danh sách và thẻ học sinh.
                </p>
              </div>
            </div>
          </div>

          {/* Student Address via VietMap (Optional) */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <label className="text-xs font-semibold text-slate-700">
                  Địa chỉ học sinh (Tùy chọn)
                </label>
                <Tooltip content="Tìm kiếm địa chỉ bằng VietMap hoặc nhấp trực tiếp trên bản đồ. Có thể để trống nếu chưa có thông tin." />
              </div>

              {addressText && (
                <Button
                  type="button"
                  onClick={handleClearAddress}
                  disabled={isSubmitting}
                  className="text-xs text-red-600 hover:underline cursor-pointer"
                >
                  Xóa địa chỉ
                </Button>
              )}
            </div>

            {/* Address input with Vietmap autocomplete */}
            <div className="relative">
              <div className="relative">
                <Input
                  type="text"
                  value={addressText}
                  onChange={handleAddressInputChange}
                  placeholder="Nhập địa chỉ nhà học sinh hoặc tìm kiếm qua VietMap..."
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:bg-slate-100"
                />
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                {(isSearching || isGettingPlace) && (
                  <SpinnerIcon className="w-4 h-4 text-amber-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <Card className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {suggestions.map((item) => (
                    <Button
                      key={item.refId}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors flex items-start gap-2 cursor-pointer"
                    >
                      <MapPinIcon className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">{item.name || item.display}</p>
                        {item.address && (
                          <p className="text-[11px] text-slate-400 line-clamp-1">{item.address}</p>
                        )}
                      </div>
                    </Button>
                  ))}
                </Card>
              )}
            </div>

            {/* VietMap Interactive Picker */}
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              <VietMapPicker
                latitude={latitude}
                longitude={longitude}
                onChangeCoordinates={handleChangeCoordinates}
                onAddressSelect={(reversedAddr) => setAddressText(reversedAddr)}
                disabled={isSubmitting}
              />
            </div>
            {latitude !== null && longitude !== null && (
              <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                <CheckIcon className="w-3.5 h-3.5" />
                Tọa độ đã được xác định qua bản đồ.
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-3">
            <Button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Hủy
            </Button>
            <Button variant="primary" size="sm"
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-primary hover:bg-amber-400 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isSubmitting && <SpinnerIcon className="w-4 h-4 animate-spin text-slate-900" />}
              <span>{isSubmitting ? 'Đang tạo...' : 'Tạo học sinh'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
