import { apiClient } from './api-client';

export interface OverviewTrip {
  id: string; name: string; schoolName: string; serviceDate: string; status: string;
  scheduledStartTime: string | null; scheduledEndTime: string | null;
  driverName: string; attendantName: string; vehiclePlate: string; waitingAssignment: boolean;
}
export interface AdminOverview {
  serviceDate: string; schoolId: string | null; schoolName: string | null; generatedAt: string;
  trips: { SCHEDULED: number; IN_PROGRESS: number; COMPLETED: number; CANCELLED: number; total: number; waitingAssignment: number };
  tasks: { kind: string; label: string; count: number; href: string }[];
  attentionTrips: OverviewTrip[]; overdueRunningTrips: OverviewTrip[];
  inventory: { key: string; label: string; count: number; href: string | null; scope: 'SCOPE' | 'OPERATOR' }[];
}
export function vietnamToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function getAdminOverview(date: string, schoolId: string): Promise<AdminOverview> {
  const params = new URLSearchParams({ serviceDate: date });
  if (schoolId) params.set('schoolId', schoolId);
  return apiClient.request(`/admin/overview?${params}`);
}
