import { useState } from 'react';
import { mobileApiClient, type ParentLinkedStudentItem } from '@/services/api-client';
import { useActiveRefresh } from '@/hooks/use-active-refresh';

type MapChild = Pick<ParentLinkedStudentItem, 'id' | 'fullName' | 'avatarUrl'>;

/** Refresh the same student profiles used by Tracking; never share data across accounts. */
export function useParentMapAvatars(identity: string, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<{ identity: string; children: MapChild[]; revision: number } | null>(null);

  useActiveRefresh(JSON.stringify([identity, enabled]), async ({ isCurrent }) => {
    if (!enabled) return false;
    try {
      const children = await mobileApiClient.getLinkedStudents();
      if (!isCurrent()) return;
      setSnapshot(previous => ({ identity,
        children: children.map(({ id, fullName, avatarUrl }) => ({ id, fullName, avatarUrl })),
        revision: previous?.identity === identity ? previous.revision + 1 : 1,
      }));
    } catch (error: any) {
      if (!isCurrent()) return;
      if ([401, 403, 404].includes(error?.statusCode)) {
        setSnapshot(null);
        return false;
      }
      // Retain known avatars on temporary errors; the foreground loop retries.
    }
  }, 20000);

  const current = enabled && snapshot?.identity === identity ? snapshot : null;
  return { children: current?.children ?? [], revision: current?.revision ?? 0 };
}
