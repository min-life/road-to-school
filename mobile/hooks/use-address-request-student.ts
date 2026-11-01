import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  mobileApiClient,
  type ParentLinkedStudentDetail,
  type ParentLinkedStudentItem,
} from '@/services/api-client';

/** A fixed student preserves profile entry; otherwise selection stays inside the form. */
export function useAddressRequestStudent(fixedStudentId?: string) {
  const isFixed = fixedStudentId !== undefined;
  const [selectedId, setSelectedId] = useState('');
  const studentId = fixedStudentId ?? selectedId;
  const [students, setStudents] = useState<ParentLinkedStudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(!isFixed);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [listAttempt, setListAttempt] = useState(0);
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [detail, setDetail] = useState<{
    id: string; student: ParentLinkedStudentDetail | null; loading: boolean; error: string | null;
  }>({ id: '', student: null, loading: false, error: null });

  useFocusEffect(useCallback(() => {
    if (isFixed) return;
    let active = true;
    setStudentsLoading(true);
    setStudentsError(null);
    mobileApiClient.getLinkedStudents().then(result => {
      if (!active) return;
      setStudents(result);
      setSelectedId(current => result.some(student => student.id === current) ? current : '');
    }).catch((failure: unknown) => {
      if (active) setStudentsError(failure instanceof Error ? failure.message : 'Không thể tải học sinh.');
    }).finally(() => { if (active) setStudentsLoading(false); });
    return () => { active = false; };
  }, [isFixed, listAttempt]));

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!studentId) {
      setDetail({ id: '', student: null, loading: false,
        error: isFixed ? 'Không tìm thấy học sinh. Vui lòng quay lại.' : null });
      return;
    }
    setDetail({ id: studentId, student: null, loading: true, error: null });
    mobileApiClient.getLinkedStudentDetail(studentId).then(student => {
      if (active) setDetail({ id: studentId, student, loading: false, error: null });
    }).catch((failure: unknown) => {
      if (active) setDetail({ id: studentId, student: null, loading: false,
        error: failure instanceof Error ? failure.message : 'Không thể tải thông tin học sinh.' });
    });
    return () => { active = false; };
  }, [studentId, isFixed, detailAttempt]));

  const linked = isFixed || students.some(student => student.id === studentId);
  const current = detail.id === studentId && linked ? detail : null;
  return {
    studentId, isFixed, students, studentsLoading, studentsError,
    student: current?.student ?? null,
    studentLoading: Boolean(studentId) && (!current || current.loading),
    studentError: current?.error ?? null,
    selectStudent: setSelectedId,
    retryStudents: () => setListAttempt(value => value + 1),
    retryStudent: () => setDetailAttempt(value => value + 1),
  };
}
