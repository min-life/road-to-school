import { RequestListView } from '@/components/parent/RequestListView';

/** Home opens request history; child selection belongs to the create flow. */
export default function ChangeStopScreen() {
  return (
    <RequestListView
      requestType="ADDRESS_UPDATE"
      appearance="leave-history"
      title="Đổi điểm đón/trả"
      createRoute="/parent/change-stop/create"
      createButtonLabel="Tạo yêu cầu đổi điểm"
      emptyMessage="Chưa có yêu cầu đổi điểm đón/trả nào."
    />
  );
}
