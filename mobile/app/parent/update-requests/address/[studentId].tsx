import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { RequestListView } from '@/components/parent/RequestListView';

export default function AddressRequestsScreen() {
  const params = useLocalSearchParams<{ studentId: string }>();
  const studentId = params.studentId || '';

  return (
    <RequestListView
      studentId={studentId}
      requestType="ADDRESS_UPDATE"
      title="Yêu cầu đổi địa chỉ"
      createRoute="/parent/create-request/address/[studentId]"
      createButtonLabel="Tạo yêu cầu đổi địa chỉ"
      emptyMessage="Chưa có yêu cầu thay đổi địa chỉ đón trả nào cho học sinh này."
    />
  );
}
