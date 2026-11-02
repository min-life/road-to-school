import type { Role } from '../services/api-client';

/** Reserve space only for a role/status branch that actually renders footer content. */
export function hasTripBottomAction(role: Role | undefined, status: string | undefined): boolean {
  return role === 'DRIVER'
    ? status === 'SCHEDULED' || status === 'IN_PROGRESS'
    : role === 'BUS_ATTENDANT' && status === 'SCHEDULED';
}
