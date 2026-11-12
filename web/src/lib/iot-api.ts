import { apiClient } from './api-client';
import type { Vehicle, VehicleListResponse } from './types';

export interface IotAssignment {
 id: string; deviceId: string; vehicleId: string; licensePlate: string; assignedAt: string; releasedAt: string | null; assignedById: string; releasedById: string | null; reason: string | null; releaseReason: string | null;
}
export interface IotAssignmentState { deviceId: string; assignment: IotAssignment | null; configurationStatus: 'UNASSIGNED' | 'PENDING' | 'CONFIRMED'; reportedAssignmentId: string | null; lastConfigAckAt: string | null }
export interface IotDevice {
  enrollmentBusy?:boolean; enrollmentState?:string; pendingSessionId?:string; enrollmentExpiresAt?:string;
  deviceId: string; name: string; macAddress: string; chipModel: string;
  assignment?: IotAssignment | null; configurationStatus?: IotAssignmentState['configurationStatus']; reportedAssignmentId?: string | null; lastConfigAckAt?: string | null;
  firmwareVersion: string; status: 'ONLINE' | 'OFFLINE'; lastSeenAt?: string;
}
export interface IotScan {
  scanId: string; deviceId: string; cardUid: string; cardType?: string;
  scannedAt: string; createdAt: string; assignmentId: string | null; vehicleId: string | null; vehicleLicensePlateSnapshot: string | null;
}
export interface IotPage<T> { data: T[]; total: number; page: number; limit: number }
export const iotApi = {
  devices: (page = 1) => apiClient.request<IotPage<IotDevice>>(`/iot/devices?limit=100&page=${page}`),
  vehicle: (vehicleId: string) => apiClient.request<Vehicle>(`/vehicles/${encodeURIComponent(vehicleId)}`, { cache: 'no-store' }),
  scans: (page = 1, deviceId = '', vehicleId = '') => apiClient.request<IotPage<IotScan>>(
    `/iot/scans?page=${page}&limit=20${deviceId ? `&deviceId=${encodeURIComponent(deviceId)}` : ''}${vehicleId ? `&vehicleId=${encodeURIComponent(vehicleId)}` : ''}`,
  ),
  register: (device: Omit<IotDevice, 'status' | 'lastSeenAt'>) =>
    apiClient.request<{ device: IotDevice; deviceKey: string }>('/iot/devices/register', {
      method: 'POST', body: JSON.stringify(device),
    }),
  provision: (device: Omit<IotDevice, 'status' | 'lastSeenAt'>) =>
    apiClient.request<{ device: IotDevice; deviceKey: string; backendUrl: string }>('/iot/devices/provision', {
      method: 'POST', body: JSON.stringify(device), cache: 'no-store',
    }),
  saveWifi: (deviceId: string, ssid: string, password: string) =>
    apiClient.request('/iot/wifi/save', { method: 'POST', body: JSON.stringify({ deviceId, ssid, password }) }),
  assignment: (deviceId: string) => apiClient.request<IotAssignmentState>(`/iot/devices/${encodeURIComponent(deviceId)}/vehicle-assignment`, { cache: 'no-store' }),
  assign: (deviceId: string, vehicleId: string, expectedAssignmentId: string | null, reason: string) => apiClient.request<IotAssignmentState>(`/iot/devices/${encodeURIComponent(deviceId)}/vehicle-assignment`, { method: 'PUT', body: JSON.stringify({ vehicleId, expectedAssignmentId, reason: reason || undefined }) }),
  release: (deviceId: string, expectedAssignmentId: string, reason: string) => apiClient.request<IotAssignmentState>(`/iot/devices/${encodeURIComponent(deviceId)}/vehicle-assignment`, { method: 'DELETE', body: JSON.stringify({ expectedAssignmentId, reason: reason || undefined }) }),
  history: (deviceId: string, page = 1) => apiClient.request<IotPage<IotAssignment>>(`/iot/devices/${encodeURIComponent(deviceId)}/vehicle-assignments?page=${page}&limit=10`, { cache: 'no-store' }),
  vehicles: async (): Promise<Vehicle[]> => {
    const vehicles: Vehicle[] = [];
    for (let page = 1; page <= 100; page++) {
      const result = await apiClient.request<VehicleListResponse>(`/vehicles?limit=100&page=${page}`);
      vehicles.push(...result.items);
      if (page >= result.totalPages) return vehicles;
    }
    throw new Error('Danh sách xe quá lớn để tải. Liên hệ quản trị máy chủ.');
  },
  firmware: () => apiClient.requestBinary('/iot/firmware/latest.bin', { cache: 'no-store' }),
};

export function iotSocketOrigin() {
  const url = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1');
  return url.origin;
}
