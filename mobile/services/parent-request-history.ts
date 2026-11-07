import {
  mobileApiClient,
  type RequestStatus,
  type RequestType,
  type StudentUpdateRequest,
  type StudentUpdateRequestListResponse,
} from './api-client';

export type ParentRequestHistoryQuery = {
  page: number;
  limit: number;
  type: RequestType;
  status?: RequestStatus;
};

/** Merge existing per-child GETs; do not require a new backend endpoint. */
export async function listLinkedStudentRequests(
  query: ParentRequestHistoryQuery,
  isCurrent: () => boolean = () => true,
): Promise<StudentUpdateRequestListResponse> {
  const students = await mobileApiClient.getLinkedStudents();
  const studentIds = [...new Set(students.map(student => student.id))];
  const needed = query.page * query.limit;
  const batchSize = Math.min(100, needed);
  const candidates: StudentUpdateRequest[] = [];
  let total = 0;

  // Bound fan-out when a parent has many linked children.
  for (let offset = 0; offset < studentIds.length; offset += 3) {
    if (!isCurrent()) throw new Error('Đã rời danh sách yêu cầu.');
    const results = await Promise.all(studentIds.slice(offset, offset + 3).map(async studentId => {
      const items: StudentUpdateRequest[] = [];
      let childTotal = 0;
      let childPage = 1;
      let childPages = 1;
      do {
        if (!isCurrent()) throw new Error('Đã rời danh sách yêu cầu.');
        const response = await mobileApiClient.listParentStudentRequests(studentId, {
          ...query, page: childPage, limit: batchSize,
        });
        childTotal = response.total;
        childPages = response.totalPages;
        items.push(...response.items);
        childPage += 1;
      } while (items.length < needed && childPage <= childPages);
      return { total: childTotal, items: items.slice(0, needed) };
    }));
    for (const result of results) {
      total += result.total;
      candidates.push(...result.items);
    }
  }

  candidates.sort((left, right) =>
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    || left.id.localeCompare(right.id));
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  const page = Math.min(query.page, totalPages);
  return {
    items: candidates.slice((page - 1) * query.limit, page * query.limit),
    total, page, totalPages,
  };
}
