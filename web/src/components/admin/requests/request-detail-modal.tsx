'use client';
import { canDirectlyUpdateAddress, validCoordinates } from '@/lib/school-admin';
import { addressApprovalOutcome, isServiceAreaRejection, validateRoutingInputs } from '@/lib/address-request-review';

import { toast } from '@/stores/toast-store';

import { useState, useEffect, useId, useRef } from 'react';
import dynamic from 'next/dynamic';
import { apiClient } from '@/lib/api-client';
import type { StudentUpdateRequestDetail, UserRole, SystemRequestRoutingPreviewResponse } from '@/lib/types';
import {
  SpinnerIcon,
  AlertIcon,
} from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { AddressRoutingReview } from './address-routing-review';
import type { MapPoint } from '@/components/admin/routes/route-map';

const RouteMap = dynamic(() => import('@/components/admin/routes/route-map').then(module => module.RouteMap), {
  ssr: false, loading: () => <p role="status" className="p-3">Đang tải bản đồ…</p>,
});
const requestDateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
const outcomeLabels = { DIRECT_UPDATE: 'Duyệt cập nhật địa chỉ', REOPTIMIZED: 'Duyệt địa chỉ và tuyến mới', REMOVED_FROM_ROUTES: 'Duyệt địa chỉ và loại khỏi tuyến' };

function requestMapPoint(data: Record<string, unknown> | undefined, id: string, title: string, order: number): MapPoint | null {
  const lat = data?.latitude;
  const lng = data?.longitude;
  const latitude = typeof lat === 'number' || (typeof lat === 'string' && lat.trim()) ? Number(lat) : NaN;
  const longitude = typeof lng === 'number' || (typeof lng === 'string' && lng.trim()) ? Number(lng) : NaN;
  return validCoordinates(latitude, longitude) ? { id, title, order, latitude, longitude, type: 'STUDENT' } : null;
}

interface RequestDetailModalProps {
  isOpen: boolean;
  requestId: string | null;
  role: UserRole;
  schoolId?: string;
  onClose: () => void;
  onActionSuccess: () => void;
}

export function RequestDetailModal(props: RequestDetailModalProps) {
  if (!props.isOpen || !props.requestId) return null;
  return <RequestDetailModalContent key={`${props.role}:${props.schoolId}:${props.requestId}`} {...props} />;
}

function RequestDetailModalContent({
  requestId,
  role,
  schoolId,
  onClose,
  onActionSuccess,
}: RequestDetailModalProps) {
  const [detail, setDetail] = useState<StudentUpdateRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const mapId = useId();

  // Approve dialog
  const [isConfirmingApprove, setIsConfirmingApprove] = useState(false);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  // Reject dialog
  const [isConfirmingReject, setIsConfirmingReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const confirmationRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (isConfirmingApprove || isConfirmingReject) confirmationRef.current?.focus();
  }, [isConfirmingApprove, isConfirmingReject]);

  // Routing Preview state (for SYSTEM_ADMIN on ADDRESS_UPDATE)
  const [routingPreview, setRoutingPreview] = useState<SystemRequestRoutingPreviewResponse | null>(null);
  const [isLoadingRoutingPreview, setIsLoadingRoutingPreview] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [minutes, setMinutes] = useState('90');
  const [seconds, setSeconds] = useState('60');
  const [hasCheckedRouting, setHasCheckedRouting] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<'DIRECT_UPDATE' | 'REOPTIMIZED' | 'REMOVED_FROM_ROUTES'>('DIRECT_UPDATE');

  const [membership, setMembership] = useState<{ key: string; allowed: boolean; error?: string } | null>(null);
  const [membershipRevision, setMembershipRevision] = useState(0);
  const membershipKey = `${schoolId}:${detail?.id}`;
  const membershipStudentId = detail?.studentId;
  const requiresMembership = role === 'SCHOOL_ADMIN' && detail?.type === 'ADDRESS_UPDATE' && detail.status === 'PENDING';
  const schoolCanApprove = !requiresMembership || (membership?.key === membershipKey && membership.allowed);
  useEffect(() => {
    let current = true;
    if (!requiresMembership || !membershipStudentId || !schoolId) return;
    apiClient.getStudentDisableImpact(schoolId, membershipStudentId)
      .then(impact => { if (current) setMembership({ key: membershipKey, allowed: canDirectlyUpdateAddress(impact) }); })
      .catch(error => { if (current) setMembership({ key: membershipKey, allowed: false, error: error instanceof Error ? error.message : 'Không thể kiểm tra tuyến.' }); });
    return () => { current = false; };
  }, [requiresMembership, membershipStudentId, schoolId, membershipKey, membershipRevision]);

  // Load detail
  useEffect(() => {
    let isMounted = true;
    async function fetchDetail() {
      try {
        setIsLoading(true);
        setError(null);
        let data: StudentUpdateRequestDetail;
        if (role === 'SYSTEM_ADMIN') {
          data = await apiClient.getSystemAdminRequestDetail(requestId!);
        } else if (schoolId) {
          data = await apiClient.getSchoolRequestDetail(schoolId, requestId!);
        } else {
          throw new Error('Thiếu thông tin trường học để xem chi tiết.');
        }

        if (isMounted) {
          setDetail(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Không thể tải chi tiết yêu cầu cập nhật.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [requestId, role, schoolId]);

  const isAddress = detail?.type === 'ADDRESS_UPDATE';
  const requiresRoutingPreview = isAddress && role === 'SYSTEM_ADMIN';
  const canReview = detail?.status === 'PENDING' && !detail.isStale;
  const outsideArea = isServiceAreaRejection(routingError);
  const routingOutcome = addressApprovalOutcome(routingPreview);
  const inputs = validateRoutingInputs(minutes, seconds);
  const currentPoint = requestMapPoint(detail?.isStale ? detail.currentStudentData : detail?.beforeData, 'current', 'Địa chỉ hiện tại', 1);
  const proposedPoint = requestMapPoint(detail?.proposedData, 'proposed', 'Địa chỉ đề xuất', 2);
  const mapPoints = [currentPoint, proposedPoint].filter((point): point is MapPoint => point !== null);
  const isSubmitting = isSubmittingApprove || isSubmittingReject;

  const invalidateRouting = () => {
    setRoutingPreview(null);
    setIsConfirmingApprove(false);
    if (!outsideArea) setRoutingError(null);
  };

  const handleCheckRouting = async () => {
    if (!detail || !canReview || !requiresRoutingPreview || outsideArea || isLoadingRoutingPreview || inputs.minutesError || inputs.secondsError) return;
    setIsLoadingRoutingPreview(true);
    setHasCheckedRouting(true);
    setRoutingPreview(null);
    setRoutingError(null);
    try {
      const res = await apiClient.getSystemRequestRoutingPreview(detail.id, {
        maxRouteDurationMinutes: inputs.maxRouteDurationMinutes,
        defaultStopServiceSeconds: inputs.defaultStopServiceSeconds,
      });
      setRoutingPreview(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kiểm tra định tuyến';
      setRoutingError(msg);
    } finally {
      setIsLoadingRoutingPreview(false);
    }
  };

  const handleApprove = async () => {
    if (!detail || !canReview || !schoolCanApprove || isSubmitting || (requiresRoutingPreview && selectedOutcome !== routingOutcome)) return;
    try {
      setIsSubmittingApprove(true);
      setError(null);
      const outcome = selectedOutcome;
      if (role === 'SYSTEM_ADMIN' && outcome === 'REOPTIMIZED' && (!routingPreview?.previewToken || !routingPreview?.expectedFingerprint)) {
        setError('Vui lòng kiểm tra định tuyến lại trước khi duyệt.');
        setIsSubmittingApprove(false);
        return;
      }
      if (role === 'SYSTEM_ADMIN') {
        await apiClient.approveSystemAdminRequest(detail.id, {
          decision: outcome,
          resolutionOutcome: outcome,
          previewToken: routingPreview?.previewToken || undefined,
          expectedFingerprint: routingPreview?.expectedFingerprint || undefined,
        });
      } else if (schoolId) {
        if (detail.type === 'ADDRESS_UPDATE') {
          const impact = await apiClient.getStudentDisableImpact(schoolId, detail.studentId);
          if (!canDirectlyUpdateAddress(impact)) { setMembership({ key: membershipKey, allowed: false }); throw new Error('Chờ nhà xe xử lý lộ trình.'); }
        }
        await apiClient.approveSchoolRequest(schoolId, detail.id);
      }
      toast.success('Đã duyệt yêu cầu.');
      setIsConfirmingApprove(false);
      onActionSuccess();
      onClose();
    } catch (err: unknown) {
      setRoutingPreview(null);
      const message = err instanceof Error ? err.message : 'Không thể phê duyệt yêu cầu. Vui lòng thử lại.';
      if (isServiceAreaRejection(message)) setRoutingError(message);
      if (!requiresRoutingPreview || !isServiceAreaRejection(message)) setError(message);
      setIsConfirmingApprove(false);
      // Refresh to get updated status/isStale
      if (role === 'SYSTEM_ADMIN') {
        apiClient.getSystemAdminRequestDetail(detail.id).then(setDetail).catch(() => {});
      } else if (schoolId) {
        apiClient.getSchoolRequestDetail(schoolId, detail.id).then(setDetail).catch(() => {});
      }
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  const handleReject = async () => {
    if (!detail || detail.status !== 'PENDING' || isSubmitting) return;
    try {
      setIsSubmittingReject(true);
      setError(null);
      const reasonTrimmed = rejectReason.trim() ? rejectReason.trim() : undefined;
      if (role === 'SYSTEM_ADMIN') {
        await apiClient.rejectSystemAdminRequest(detail.id, {
          rejectionReason: reasonTrimmed,
        });
      } else if (schoolId) {
        await apiClient.rejectSchoolRequest(schoolId, detail.id, {
          rejectionReason: reasonTrimmed,
        });
      }
      toast.success('Đã từ chối yêu cầu.');
      setIsConfirmingReject(false);
      onActionSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể từ chối yêu cầu. Vui lòng thử lại.');
      setIsConfirmingReject(false);
      if (role === 'SYSTEM_ADMIN') {
        apiClient.getSystemAdminRequestDetail(detail.id).then(setDetail).catch(() => {});
      } else if (schoolId) {
        apiClient.getSchoolRequestDetail(schoolId, detail.id).then(setDetail).catch(() => {});
      }
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ duyệt
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã duyệt
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Đã từ chối
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            Phụ huynh đã hủy
          </Badge>
        );
      default:
        return null;
    }
  };

  const checkLabel = isLoadingRoutingPreview ? 'Đang kiểm tra…'
    : routingError || routingPreview ? 'Thử lại' : hasCheckedRouting ? 'Kiểm tra lại tuyến' : 'Kiểm tra tuyến';
  const startApproval = (outcome: keyof typeof outcomeLabels) => {
    setSelectedOutcome(outcome);
    setIsConfirmingApprove(true);
  };
  const footer = isConfirmingApprove || isConfirmingReject ? <>
    <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => {
      setIsConfirmingApprove(false);
      setIsConfirmingReject(false);
    }}>Quay lại</Button>
    {isConfirmingReject
      ? <Button type="button" variant="danger" disabled={isSubmitting} onClick={handleReject}>Xác nhận từ chối</Button>
      : <Button type="button" variant={selectedOutcome === 'REMOVED_FROM_ROUTES' ? 'danger' : 'primary'}
          disabled={isSubmitting || !canReview || !schoolCanApprove || (requiresRoutingPreview && selectedOutcome !== routingOutcome)}
          onClick={handleApprove}>Xác nhận phê duyệt</Button>}
  </> : detail?.status === 'PENDING' && !isLoading ? <>
    {requiresMembership && !schoolCanApprove && <div role="status" className="basis-full text-sm text-amber-800">
      {membership?.key !== membershipKey ? 'Đang kiểm tra tuyến…' : membership.error || 'Chờ nhà xe xử lý lộ trình.'}
      {membership?.error && <Button type="button" variant="outline" size="sm" className="ml-2" onClick={() => { setMembership(null); setMembershipRevision(value => value + 1); }}>Thử lại</Button>}
    </div>}
    <Button type="button" variant="outline" className="mr-auto !text-rose-700" disabled={isSubmitting}
      onClick={() => setIsConfirmingReject(true)}>Từ chối</Button>
    {requiresRoutingPreview
      ? routingOutcome
        ? <Button type="button" variant="primary" disabled={!canReview || isSubmitting}
            onClick={() => startApproval(routingOutcome)}>{outcomeLabels[routingOutcome]}</Button>
        : !outsideArea && <Button type="button" variant="primary"
            disabled={!canReview || isSubmitting || isLoadingRoutingPreview || !!inputs.minutesError || !!inputs.secondsError}
            onClick={handleCheckRouting}>{checkLabel}</Button>
      : <Button type="button" variant="primary" disabled={!canReview || !schoolCanApprove || outsideArea || isSubmitting}
          onClick={() => startApproval('DIRECT_UPDATE')}>{isAddress ? outcomeLabels.DIRECT_UPDATE : 'Phê duyệt'}</Button>}
  </> : undefined;

  return (
    <LifecycleDialog open title={isAddress ? 'Yêu cầu đổi địa chỉ đón trả' : 'Yêu cầu cập nhật thông tin học sinh'} onClose={onClose}
      busy={isSubmitting} footer={footer} className={isAddress ? '!w-[min(630px,calc(100vw_-_24px))]' : ''}
      summary={detail && <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-slate-600">
        <p><strong className="text-slate-900">{detail.studentName || 'Học sinh'}</strong>
          {isAddress && <> · Gửi lúc {requestDateTime.format(new Date(detail.createdAt))}</>}
        </p>
        {getStatusBadge(detail.status)}
      </div>}>
        <div className="space-y-5 text-xs text-slate-700">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <SpinnerIcon className="w-6 h-6 animate-spin text-amber-500 mb-2" />
              <span>Đang tải thông tin chi tiết...</span>
            </div>
          )}

          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
              <AlertIcon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {detail && !isLoading && (
            <>
              {(!isAddress || detail.reviewedAt) && <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {!isAddress && <div><dt className="text-slate-600">Mã học sinh</dt><dd className="font-medium text-slate-900">{detail.studentCode || '—'}</dd></div>}
                {!isAddress && <div><dt className="text-slate-600">Thời gian gửi</dt><dd>{requestDateTime.format(new Date(detail.createdAt))}</dd></div>}
                {detail.reviewedAt && <div><dt className="text-slate-600">Thời gian xử lý</dt><dd>{requestDateTime.format(new Date(detail.reviewedAt))}</dd></div>}
              </dl>}

              {/* Stale warning banner */}
              {detail.isStale && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2">
                  <AlertIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Dữ liệu học sinh đã thay đổi</span>
                    <span className="text-[11px] text-amber-700">
                      Dữ liệu học sinh đã được cập nhật sau khi yêu cầu này được gửi đi. Quản trị viên không thể
                      phê duyệt yêu cầu lỗi thời này. Vui lòng từ chối yêu cầu để phụ huynh gửi lại nếu cần.
                    </span>
                  </div>
                </div>
              )}

              {/* Rejection reason (if REJECTED) */}
              {detail.status === 'REJECTED' && detail.rejectionReason && (
                <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-rose-900">
                  <span className="font-semibold block text-[11px] text-rose-600 mb-0.5">Lý do từ chối:</span>
                  <span className="text-xs">{detail.rejectionReason}</span>
                </div>
              )}

              {/* Comparison Section */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{isAddress ? 'Địa chỉ đón trả' : 'So sánh dữ liệu thay đổi'}</h3>
                  {isAddress && mapPoints.length > 0 && <button type="button" aria-expanded={showMap} aria-controls={mapId}
                    className="rounded text-sm font-semibold text-blue-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                    onClick={() => setShowMap(value => !value)}>
                    {showMap ? 'Ẩn bản đồ' : mapPoints.length === 2 ? 'Xem hai điểm trên bản đồ' : 'Xem điểm trên bản đồ'}
                  </button>}
                </div>
                {isAddress && <div className={`grid divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 sm:divide-x sm:divide-y-0 ${detail.isStale ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                  {detail.isStale && <div className="space-y-1 p-3.5">
                    <h4 className="font-medium text-slate-600">Lúc gửi yêu cầu</h4>
                    <p className="break-words text-sm text-slate-900">{detail.beforeData?.addressText || 'Chưa có địa chỉ'}</p>
                  </div>}
                  <div className="space-y-1 p-3.5">
                    <h4 className="font-medium text-slate-600">Địa chỉ hiện tại</h4>
                    <p className="break-words text-sm text-slate-900">{(detail.isStale ? detail.currentStudentData : detail.beforeData)?.addressText || 'Chưa có địa chỉ'}</p>
                  </div>
                  <div className="space-y-1 p-3.5">
                    <h4 className="font-medium text-slate-600">Địa chỉ đề xuất</h4>
                    <p className="break-words text-sm font-medium text-slate-900">{detail.proposedData?.addressText || 'Chưa có địa chỉ'}</p>
                    {(requiresRoutingPreview || outsideArea) && detail.status === 'PENDING' && <p role="status" className={routingPreview ? 'font-semibold text-emerald-800' : outsideArea ? 'font-semibold text-amber-900' : 'text-slate-600'}>
                      {routingPreview ? 'Trong phạm vi phục vụ' : outsideArea ? 'Ngoài phạm vi phục vụ' : isLoadingRoutingPreview ? 'Đang xác minh phạm vi…' : 'Chưa xác minh phạm vi'}
                    </p>}
                  </div>
                </div>}
                {isAddress && mapPoints.length > 0 && <div id={mapId} hidden={!showMap}>
                  {showMap && <section aria-label="Vị trí đón trả" className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2">
                      {mapPoints.map(point => <span key={point.id} className="font-medium">{point.order}. {point.title}</span>)}
                      {mapPoints.length === 1 && <span>Chưa có tọa độ của {currentPoint ? 'địa chỉ đề xuất' : 'địa chỉ hiện tại'}.</span>}
                    </div>
                    <RouteMap height="270px" points={mapPoints} />
                  </section>}
                </div>}

                {/* Case 2: INFORMATION_UPDATE (School Admin Only) */}
                {detail.type === 'INFORMATION_UPDATE' && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    {detail.isStale ? (
                      <Table className="w-full text-left border-collapse ui-table-comparison">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <th className="p-2.5">Trường thông tin</th>
                            <th className="p-2.5">Lúc gửi</th>
                            <th className="p-2.5 bg-amber-50/40 text-amber-900">Hiện tại</th>
                            <th className="p-2.5 bg-emerald-50/40 text-emerald-900">Đề xuất</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detail.proposedData?.fullName && (
                            <tr>
                              <td className="p-2.5 font-medium text-slate-500">Họ và tên học sinh</td>
                              <td className="p-2.5 text-slate-600">{detail.beforeData?.fullName || '—'}</td>
                              <td className="p-2.5 bg-amber-50/20 text-amber-900 font-medium">
                                {detail.currentStudentData?.fullName || '—'}
                              </td>
                              <td className="p-2.5 bg-emerald-50/20 text-emerald-900 font-bold">
                                {detail.proposedData.fullName}
                              </td>
                            </tr>
                          )}
                          {detail.proposedData?.guardianPhone && (
                            <tr>
                              <td className="p-2.5 font-medium text-slate-500">Số điện thoại phụ huynh</td>
                              <td className="p-2.5 text-slate-600">{detail.beforeData?.guardianPhone || '—'}</td>
                              <td className="p-2.5 bg-amber-50/20 text-amber-900 font-medium">
                                {detail.currentStudentData?.guardianPhone || '—'}
                              </td>
                              <td className="p-2.5 bg-emerald-50/20 text-emerald-900 font-bold">
                                {detail.proposedData.guardianPhone}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    ) : (
                      <Table className="w-full text-left border-collapse ui-table-comparison">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <th className="p-3 w-1/3">Trường thông tin</th>
                            <th className="p-3 w-1/3">Dữ liệu ban đầu</th>
                            <th className="p-3 w-1/3 bg-emerald-50/40 text-emerald-900">Dữ liệu đề xuất mới</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detail.proposedData?.fullName && (
                            <tr>
                              <td className="p-3 font-medium text-slate-600">Họ và tên học sinh</td>
                              <td className="p-3 text-slate-600">{detail.beforeData?.fullName || '—'}</td>
                              <td className="p-3 bg-emerald-50/20 text-emerald-900 font-bold">
                                {detail.proposedData.fullName}
                              </td>
                            </tr>
                          )}
                          {detail.proposedData?.guardianPhone && (
                            <tr>
                              <td className="p-3 font-medium text-slate-600">Số điện thoại phụ huynh</td>
                              <td className="p-3 text-slate-600">{detail.beforeData?.guardianPhone || '—'}</td>
                              <td className="p-3 bg-emerald-50/20 text-emerald-900 font-bold">
                                {detail.proposedData.guardianPhone}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    )}
                  </div>
                )}

                {/* Display existing resolution if already resolved */}
                {detail.resolution && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <span className="font-semibold text-slate-700">Kết quả xử lý phân tuyến: </span>
                    <span className="font-bold text-slate-900">
                      {detail.resolution.outcome === 'DIRECT_UPDATE'
                        ? 'Cập nhật trực tiếp địa chỉ học sinh (chưa phân tuyến)'
                        : detail.resolution.outcome === 'REOPTIMIZED'
                        ? 'Đã tối ưu và cập nhật vào tuyến xe mới'
                        : detail.resolution.outcome === 'REMOVED_FROM_ROUTES'
                        ? 'Đã cập nhật địa chỉ và loại học sinh khỏi các tuyến'
                        : detail.resolution.outcome}
                    </span>
                  </div>
                )}

                {requiresRoutingPreview && canReview && <AddressRoutingReview preview={routingPreview} busy={isLoadingRoutingPreview}
                  error={routingError} hasChecked={hasCheckedRouting} minutes={minutes} seconds={seconds}
                  minutesError={inputs.minutesError} secondsError={inputs.secondsError}
                  onMinutes={value => { setMinutes(value); invalidateRouting(); }} onSeconds={value => { setSeconds(value); invalidateRouting(); }} />}
              </div>

              {isConfirmingReject && <section ref={confirmationRef} tabIndex={-1} className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/50 p-3">
                <h3 className="text-sm font-semibold text-rose-900">Từ chối yêu cầu</h3>
                <label className="block space-y-1">
                  <span>Lý do từ chối (tùy chọn)</span>
                  <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2}
                    placeholder="Nhập lý do gửi đến phụ huynh…" disabled={isSubmitting} className="w-full" />
                </label>
              </section>}

              {isConfirmingApprove && <section ref={confirmationRef} tabIndex={-1} className={`space-y-1 rounded-xl border p-3 text-sm ${selectedOutcome === 'REMOVED_FROM_ROUTES' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>
                <h3 className="font-semibold">{isAddress ? outcomeLabels[selectedOutcome] : 'Xác nhận phê duyệt'}</h3>
                <p>{selectedOutcome === 'REOPTIMIZED'
                  ? 'Địa chỉ và tuyến mới sẽ áp dụng cho các chuyến đủ điều kiện cập nhật.'
                  : selectedOutcome === 'REMOVED_FROM_ROUTES'
                    ? `Địa chỉ của ${detail.studentName} sẽ được cập nhật và học sinh sẽ bị loại khỏi các tuyến chưa duyệt hoặc đang hoạt động.`
                    : isAddress ? 'Địa chỉ đón trả mới sẽ được lưu vào hồ sơ học sinh.' : 'Thông tin đề xuất sẽ được lưu vào hồ sơ học sinh.'}</p>
              </section>}
            </>
          )}
        </div>

    </LifecycleDialog>
  );
}
