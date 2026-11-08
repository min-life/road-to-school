'use client';

import { useState } from 'react';
import type { StudentListItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type SelectedStudent = Pick<StudentListItem, 'id' | 'code' | 'fullName'>;

export function useStudentCardSelection(scope: string, students: StudentListItem[]) {
  const [selection, setSelection] = useState<{ scope: string; rows: Record<string, SelectedStudent> }>({ scope, rows: {} });
  const selected = selection.scope === scope ? selection.rows : {};
  const values = Object.values(selected);
  const allOnPage = students.length > 0 && students.every(student => !!selected[student.id]);
  const someOnPage = students.some(student => !!selected[student.id]);
  const update = (rows: StudentListItem[], remove: boolean) => {
    setSelection(previous => {
      const next = previous.scope === scope ? { ...previous.rows } : {};
      rows.forEach(student => {
        if (remove) delete next[student.id];
        else next[student.id] = { id: student.id, code: student.code, fullName: student.fullName };
      });
      return { scope, rows: next };
    });
  };
  return {
    selected, values, allOnPage, someOnPage,
    toggle: (student: StudentListItem) => update([student], !!selected[student.id]),
    togglePage: () => update(students, allOnPage),
    clear: () => setSelection({ scope, rows: {} }),
  };
}

export function StudentCardSelectionCheckbox({ checked, mixed = false, disabled, label, onChange }: {
  checked: boolean; mixed?: boolean; disabled?: boolean; label: string; onChange: () => void;
}) {
  return <Input type="checkbox" checked={checked} aria-checked={mixed ? 'mixed' : checked}
    ref={node => { if (node) node.indeterminate = mixed; }} disabled={disabled}
    onChange={onChange} aria-label={label} className="h-4 w-4 cursor-pointer disabled:cursor-default" />;
}

export function StudentCardSelectionToolbar({ count, onClear, onPrint, printing = false, onCancel }: {
  count: number; onClear: () => void; onPrint: () => void; printing?: boolean; onCancel?: () => void;
}) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
    <span className="text-sm text-slate-600" role="status" aria-live="polite">Đã chọn {count} học sinh</span>
    <div className="flex gap-2">
      {printing ? <Button type="button" variant="outline" size="sm" onClick={onCancel}>Hủy</Button>
        : <Button type="button" variant="outline" size="sm" disabled={!count} onClick={onClear}>Bỏ chọn</Button>}
      <Button type="button" variant="primary" size="sm" disabled={!count || printing} onClick={onPrint}>{printing ? 'Đang chuẩn bị in…' : `In thẻ (${count})`}</Button>
    </div>
  </div>;
}
