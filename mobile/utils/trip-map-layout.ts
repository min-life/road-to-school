import type { Role } from '../services/api-client';

/** Show trip operations only for roles/statuses with an existing action. */
export function hasTripAction(role: Role | undefined, status: string | undefined): boolean {
  return role === 'DRIVER'
    ? status === 'SCHEDULED' || status === 'IN_PROGRESS'
    : role === 'BUS_ATTENDANT' && status === 'SCHEDULED';
}
