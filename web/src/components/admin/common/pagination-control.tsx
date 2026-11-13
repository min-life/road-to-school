'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getPaginationItems } from './pagination-items';
import './pagination.css';

interface PaginationControlProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  loading?: boolean;
  limitOptions?: number[];
}

export function PaginationControl({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  loading = false,
  limitOptions = [10, 20, 50, 100],
}: PaginationControlProps) {
  if (total === 0) {
    return null;
  }

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);
  const effectiveTotalPages = Math.max(1, totalPages);

  return (
    <div className="ui-pagination" aria-busy={loading}>
      <span className="ui-pagination-info">
        Hiển thị <strong>{startRecord}</strong> – <strong>{endRecord}</strong> trên{' '}
        <strong>{total}</strong> bản ghi
      </span>
      <PageNavigation
        page={page}
        totalPages={effectiveTotalPages}
        onPageChange={onPageChange}
        loading={loading}
      />
      <label className="ui-pagination-size">
        <span>Số dòng:</span>
        <Select
          value={limit}
          onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
          disabled={loading}
        >
          {limitOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </Select>
      </label>
    </div>
  );
}

/** Navigation only: the caller owns data, page state and request timing. */
export function PageNavigation({ page, totalPages, onPageChange, loading = false }: {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  loading?: boolean;
}) {
  const count = Math.max(1, totalPages);
  const renderItems = (windowSize: number) => getPaginationItems(page, count, windowSize).map((item) => (
    typeof item === 'number' ? (
      <Button
        key={item}
        type="button"
        aria-label={`Trang ${item}`}
        aria-current={item === page ? 'page' : undefined}
        disabled={loading}
        onClick={() => { if (item !== page) onPageChange(item); }}
      >
        {item}
      </Button>
    ) : <span key={item} className="ui-pagination-ellipsis" aria-hidden="true">…</span>
  ));

  return (
    <nav className="ui-pagination-pages" aria-label="Phân trang">
      <Button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || loading} aria-label="Trang trước" title="Trang trước">
        <ChevronLeftIcon className="w-4 h-4" />
      </Button>
      <span className="ui-pagination-desktop">{renderItems(5)}</span>
      <span className="ui-pagination-mobile">{renderItems(1)}</span>
      <Button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= count || loading} aria-label="Trang sau" title="Trang sau">
        <ChevronRightIcon className="w-4 h-4" />
      </Button>
    </nav>
  );
}
