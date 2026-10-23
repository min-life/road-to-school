import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { RequestListView } from '@/components/parent/RequestListView';

export default function InformationRequestsScreen() {
  const params = useLocalSearchParams<{ studentId: string }>();
  const studentId = params.studentId || '';

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
