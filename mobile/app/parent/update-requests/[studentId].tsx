import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { RequestListView } from '@/components/parent/RequestListView';
import { RequestType } from '@/services/api-client';

export default function LegacyStudentRequestsScreen() {
  const params = useLocalSearchParams<{
    studentId: string;
    type?: RequestType;
  }>();
  const studentId = params.studentId || '';
  const isAddress = params.type === 'ADDRESS_UPDATE';

  if (isAddress) {
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

  return (
    <RequestListView
      studentId={studentId}
      requestType="INFORMATION_UPDATE"
      title="Yêu cầu đổi thông tin"
      createRoute="/parent/create-request/information/[studentId]"
      createButtonLabel="Tạo yêu cầu đổi thông tin"
      emptyMessage="Chưa có yêu cầu thay đổi thông tin (họ tên, số điện thoại) nào cho học sinh này."
    />
  );
}
