'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type {
  StudentInsertionOptionsResponse,
  RouteInsertionOptionPair,
  StudentInsertionPreviewResponse,
} from '@/lib/types';
import {
  CloseIcon,
  SpinnerIcon,
  AlertIcon,
  CheckIcon,
  BusIcon,
} from '@/components/icons';

interface InsertStudentModalProps {
  isOpen: boolean;
  studentId: string | null;
  studentName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function InsertStudentModal({
  isOpen,
  studentId,
  studentName,
  onClose,
  onSuccess,
}: InsertStudentModalProps) {
  const [options, setOptions] = useState<StudentInsertionOptionsResponse | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPairIndex, setSelectedPairIndex] = useState<number | null>(null);

  // Optimization criteria inputs
  const [maxRouteDurationMinutes, setMaxRouteDurationMinutes] = useState(90);
  const [defaultStopServiceSeconds, setDefaultStopServiceSeconds] = useState(60);

  // Preview state
  const [preview, setPreview] = useState<StudentInsertionPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Confirm state
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (isOpen && studentId) {
      setOptions(null);
      setSelectedPairIndex(null);
      setPreview(null);
      setError(null);
      setPreviewError(null);
      setLoadingOptions(true);

      apiClient
        .getStudentInsertionOptions(studentId)
        .then((res) => {
          setOptions(res);
          const pairsList = Array.isArray(res?.candidatePairs)
            ? res.candidatePairs
            : Array.isArray(res?.pairs)
            ? res.pairs
            : [];
          if (pairsList.length > 0) {
            setSelectedPairIndex(0);
            setMaxRouteDurationMinutes(pairsList[0].defaultMaxRouteDurationMinutes || 90);
            setDefaultStopServiceSeconds(pairsList[0].defaultStopServiceSeconds || 60);
          }
        })
        .catch((err) => {
          setError(err?.message || 'Không thể tải danh sách tuyến khả dụng');
        })
        .finally(() => {
          setLoadingOptions(false);
        });
    }
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const candidatePairs: RouteInsertionOptionPair[] =
    Array.isArray(options?.candidatePairs)
      ? options.candidatePairs
      : Array.isArray(options?.pairs)
      ? options.pairs
      : [];

  const selectedPair: RouteInsertionOptionPair | null =
    selectedPairIndex !== null && candidatePairs[selectedPairIndex]
      ? candidatePairs[selectedPairIndex]
      : null;

  const handleRunPreview = async () => {
    if (!studentId || !selectedPair) return;
    setLoadingPreview(true);
    setPreviewError(null);
    setPreview(null);

    try {
      const res = await apiClient.previewStudentInsertion({
        studentId,
        outboundRouteId: selectedPair.outboundRoute.id,
        returnRouteId: selectedPair.returnRoute.id,
        routingConstraints: {
          maxRouteDurationMinutes,
          defaultStopServiceSeconds,
        },
      });
      setPreview(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kiểm tra tính khả thi trên cặp tuyến';
      setPreviewError(msg);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirm = async () => {
    if (!studentId || !selectedPair || !preview || !preview.previewToken) return;
    if (!preview.isFeasible) return;

    setConfirming(true);
    setError(null);

    try {
      await apiClient.confirmStudentInsertion({
        previewToken: preview.previewToken,
        expectedFingerprint: preview.expectedFingerprint,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xác nhận thêm học sinh vào tuyến';
      setError(msg);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900">
              Thêm học sinh vào tuyến có sẵn
            </h2>
            <p className="text-xs text-slate-500">
              Học sinh: <strong className="text-slate-800">{studentName || options?.student?.fullName || options?.studentName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertIcon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loadingOptions ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <SpinnerIcon className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-xs">Đang tìm các cặp tuyến khả dụng...</span>
            </div>
          ) : options?.hasActiveMembership ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <strong className="font-bold">Học sinh đã thuộc tuyến hiệu lực:</strong>
              <p>
                Em đã được phân vào phương án tuyến DRAFT hoặc ACTIVE. Chỉ có thể thêm vào tuyến cho học sinh chưa có tuyến.
              </p>
            </div>
          ) : options && candidatePairs.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-center">
              Không tìm thấy cặp tuyến đi/về nào trong cùng phương án tuyến thuộc trường học sinh.
            </div>
          ) : options ? (
            <div className="space-y-4">
              {/* Chọn cặp tuyến */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Chọn cặp tuyến cùng phương án:
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {candidatePairs.map((pair, idx) => {
                    const isSelected = selectedPairIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedPairIndex(idx);
                          setPreview(null);
                          setPreviewError(null);
                          setMaxRouteDurationMinutes(pair.defaultMaxRouteDurationMinutes || 90);
                          setDefaultStopServiceSeconds(pair.defaultStopServiceSeconds || 60);
                        }}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50/50 ring-2 ring-amber-400/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-800 mb-1">
                          <span>{pair.planName}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {pair.planStatus}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <BusIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              Đi: {pair.outboundRoute.name} ({pair.outboundRoute.currentStudentsCount}/{pair.outboundRoute.vehicleCapacity} chỗ - {pair.outboundRoute.vehiclePlate})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BusIcon className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span>
                              Về: {pair.returnRoute.name} ({pair.returnRoute.currentStudentsCount}/{pair.returnRoute.vehicleCapacity} chỗ - {pair.returnRoute.vehiclePlate})
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hai tiêu chí tối ưu đúng nghiệp vụ */}
              {selectedPair && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                      Thời gian tối đa tuyến (phút)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={180}
                      value={maxRouteDurationMinutes}
                      onChange={(e) => {
                        setMaxRouteDurationMinutes(Number(e.target.value) || 10);
                        setPreview(null);
                        setPreviewError(null);
                      }}
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                    <span className="text-[10px] text-slate-500">Giới hạn tổng di chuyển & dừng</span>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                      Thời gian dừng tại điểm (giây)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={300}
                      value={defaultStopServiceSeconds}
                      onChange={(e) => {
                        setDefaultStopServiceSeconds(Number(e.target.value) || 60);
                        setPreview(null);
                        setPreviewError(null);
                      }}
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                    <span className="text-[10px] text-slate-500">Thời gian phục vụ đón/trả</span>
                  </div>
                </div>
              )}

              {/* Action: Kiểm tra khả thi */}
              {selectedPair && (
                <div className="pt-1">
                  <button
                    type="button"
                    disabled={loadingPreview}
                    onClick={handleRunPreview}
                    className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    {loadingPreview && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
                    <span>Kiểm tra tính khả thi trên cả 2 chiều</span>
                  </button>
                </div>
              )}

              {previewError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {previewError}
                </div>
              )}

              {/* Preview Results */}
              {preview && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-semibold text-slate-700">Kết quả tối ưu:</span>
                    {preview.isFeasible ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckIcon className="w-3 h-3" /> Cả 2 chiều đều khả thi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertIcon className="w-3 h-3" /> Không khả thi
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Chiều đi */}
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-800">Chiều đi (TO_SCHOOL)</span>
                      {preview.outbound.stopOrder && (
                        <p className="text-slate-600">Thứ tự dừng: #{preview.outbound.stopOrder}</p>
                      )}
                      {preview.outbound.plannedArrivalTime && (
                        <p className="text-slate-600">Giờ đón dự kiến: {preview.outbound.plannedArrivalTime}</p>
                      )}
                      <p className="text-slate-600">
                        Thời gian: {Math.round(preview.outbound.newDurationSeconds / 60)} phút • Quãng đường: {(preview.outbound.newDistanceMeters / 1000).toFixed(1)} km
                      </p>
                      <span className={`font-semibold block ${preview.outbound.feasibility === 'FEASIBLE' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {preview.outbound.feasibility}
                      </span>
                      {preview.outbound.infeasibilityReason && (
                        <p className="text-[11px] text-rose-600">{preview.outbound.infeasibilityReason}</p>
                      )}
                    </div>

                    {/* Chiều về */}
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-800">Chiều về (TO_PARKING)</span>
                      {preview.returnRoute.stopOrder && (
                        <p className="text-slate-600">Thứ tự dừng: #{preview.returnRoute.stopOrder}</p>
                      )}
                      {preview.returnRoute.plannedArrivalTime && (
                        <p className="text-slate-600">Giờ trả dự kiến: {preview.returnRoute.plannedArrivalTime}</p>
                      )}
                      <p className="text-slate-600">
                        Thời gian: {Math.round(preview.returnRoute.newDurationSeconds / 60)} phút • Quãng đường: {(preview.returnRoute.newDistanceMeters / 1000).toFixed(1)} km
                      </p>
                      <span className={`font-semibold block ${preview.returnRoute.feasibility === 'FEASIBLE' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {preview.returnRoute.feasibility}
                      </span>
                      {preview.returnRoute.infeasibilityReason && (
                        <p className="text-[11px] text-rose-600">{preview.returnRoute.infeasibilityReason}</p>
                      )}
                    </div>
                  </div>

                  {/* PO Invariant Notice */}
                  <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                    <strong>Lưu ý:</strong> Thao tác này chỉ cập nhật tuyến xe và áp dụng cho các chuyến được sinh sau. Không sửa đổi bất kỳ chuyến xe nào đã sinh trước đó.
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            disabled={confirming}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={!preview?.isFeasible || !preview?.previewToken || confirming}
            onClick={handleConfirm}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
          >
            {confirming && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
            <span>Xác nhận thêm vào tuyến</span>
          </button>
        </div>
      </div>
    </div>
  );
}
