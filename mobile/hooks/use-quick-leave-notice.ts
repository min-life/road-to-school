import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { mobileApiClient } from '@/services/api-client';

export interface TriggerQuickLeaveNoticeParams {
  tripId: string;
  studentId?: string;
  subjectName: string;
  routeName: string;
  serviceDate: string;
  direction: 'TO_SCHOOL' | 'TO_PARKING';
  onSuccess?: () => void;
}

export function useQuickLeaveNotice() {
  const router = useRouter();
  const [requestingTripId, setRequestingTripId] = useState<string | null>(null);

  const isRequesting = (tripId?: string): boolean => {
    if (!tripId) return requestingTripId !== null;
    return requestingTripId === tripId;
  };

  const triggerQuickLeaveNotice = useCallback(
    ({
      tripId,
      studentId,
      subjectName,
      routeName,
      serviceDate,
      direction,
      onSuccess,
    }: TriggerQuickLeaveNoticeParams) => {
      // Guard against in-flight requests / double tap
      if (requestingTripId) return;

      const directionText =
        direction === 'TO_SCHOOL' ? 'Chiều đi (Đến trường)' : 'Chiều về (Về nhà)';

      Alert.alert(
        'Báo nghỉ chuyến này?',
        `${subjectName} · ${serviceDate} · ${directionText} · ${routeName}\n\nHệ thống sẽ gửi mã xác thực OTP để hoàn tất báo nghỉ.`,
        [
          { text: 'Đóng', style: 'cancel' },
          {
            text: 'Xác nhận',
            onPress: async () => {
              if (requestingTripId) return;
              try {
                setRequestingTripId(tripId);
                const res = await mobileApiClient.requestLeaveNoticeOtp({
                  tripId,
                  studentId: studentId || undefined,
                });

                if (onSuccess) {
                  onSuccess();
                }

                router.push({
                  pathname: '/leave-notices/otp',
                  params: {
                    challengeId: res.challengeId,
                    maskedChannels: JSON.stringify(res.maskedChannels || []),
                    expiresInSeconds: String(res.expiresInSeconds || 300),
                    tripId,
                    studentId: studentId || '',
                    subjectName,
                    routeName,
                    serviceDate,
                    direction,
                  },
                } as any);
              } catch (err: any) {
                Alert.alert(
                  'Không thể gửi mã OTP',
                  err?.message || 'Có lỗi xảy ra khi yêu cầu mã xác thực. Vui lòng thử lại.'
                );
              } finally {
                setRequestingTripId(null);
              }
            },
          },
        ]
      );
    },
    [requestingTripId, router]
  );

  return {
    triggerQuickLeaveNotice,
    isRequesting,
    requestingTripId,
  };
}
