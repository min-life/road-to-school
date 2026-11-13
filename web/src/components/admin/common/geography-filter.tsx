'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import './geography-filter.css';
import { apiClient } from '@/lib/api-client';
import type { GeographyQuery, LocationOptions } from '@/lib/types';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FilterField } from '@/components/ui/filter-toolbar';

export function GeographyFilter({ schoolId, value, onChange, compact = false, popover = false }: {
  schoolId?: string; value: GeographyQuery; onChange: (value: GeographyQuery) => void; compact?: boolean; popover?: boolean;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const position = useCallback(() => {
    if (!trigger.current || !popup.current) return;
    const rect = trigger.current.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) { popup.current.hidePopover(); return; }
    const width = Math.min(340, innerWidth - 24);
    const below = innerHeight - rect.bottom - 20;
    const above = rect.top - 20;
    const useAbove = below < 240 && above > below;
    popup.current.style.width = `${width}px`;
    popup.current.style.maxHeight = `${Math.max(0, Math.min(360, useAbove ? above : below))}px`;
    popup.current.style.left = `${Math.max(12, Math.min(rect.right - width, innerWidth - width - 12))}px`;
    popup.current.style.top = `${useAbove ? Math.max(12, rect.top - popup.current.offsetHeight - 8) : rect.bottom + 8}px`;
  }, []);
  useEffect(() => {
    if (!open) return;
    const reposition = (event: Event) => {
      if (event.target instanceof Node && popup.current?.contains(event.target)) return;
      position();
    };
    const observer = new ResizeObserver(position);
    if (popup.current) observer.observe(popup.current);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => { observer.disconnect(); window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true); };
  }, [open, position]);
  const [revision, setRevision] = useState(0);
  const scope = (schoolId || 'schools') + ':' + revision;
  const [result, setResult] = useState<{ scope: string; options?: LocationOptions; error?: string } | null>(null);
  useEffect(() => {
    let current = true;
    apiClient.getLocationOptions(schoolId).then(options => {
      if (current) setResult({ scope, options });
    }).catch(error => { if (current) setResult({ scope, error: error instanceof Error ? error.message : 'Không thể tải địa giới.' }); });
    return () => { current = false; };
  }, [schoolId, scope]);
  const options = result?.scope === scope ? result.options : undefined;
  const error = result?.scope === scope ? result.error : undefined;
  const wards = options?.wards.filter(ward => !value.provinceId || ward.provinceId === value.provinceId) ?? [];
  const fields = <div className="geography-filter-fields grid grid-cols-2 gap-2 min-w-0">
      <FilterField label="Tỉnh/thành"><Select aria-label="Tỉnh/thành" value={value.provinceId || ''} disabled={!options}
        onChange={event => onChange({ provinceId: event.target.value || undefined })}>
        <option value="">{options ? 'Tất cả tỉnh/thành' : error ? 'Chưa tải được' : 'Đang tải…'}</option>
        {options?.provinces.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select></FilterField>
      <FilterField label="Phường/xã"><Select aria-label="Phường/xã" value={value.wardId || ''} disabled={!options}
        onChange={event => onChange({ ...value, wardId: event.target.value || undefined })}>
        <option value="">Tất cả phường/xã</option>
        {wards.map(item => <option key={item.provinceId + ':' + item.id} value={item.id}>{item.name}</option>)}
      </Select></FilterField>
    </div>;
  const errorContent = error && <div role="alert" className="geography-filter-error text-xs text-rose-700 mt-1">{error} <Button type="button" size="sm" variant="ghost" onClick={() => setRevision(v => v + 1)}>Thử lại</Button></div>;
  if (!popover) return <div className={compact ? 'w-full min-w-0' : 'min-w-0 flex-1'} style={{ flexBasis: compact ? undefined : 400 }}>{fields}{errorContent}</div>;
  const activeCount = Number(!!value.provinceId) + Number(!!value.wardId);
  const selectedLabels = [options?.provinces.find(item => item.id === value.provinceId)?.name,
    options?.wards.find(item => item.id === value.wardId && (!value.provinceId || item.provinceId === value.provinceId))?.name].filter(Boolean).join(' · ');
  return <>
    <Button ref={trigger} type="button" variant="outline" size="sm" className="geography-filter-trigger" popoverTarget={id}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={position}>
      <SlidersHorizontal size={15} aria-hidden="true" />Bộ lọc{activeCount > 0 && ` · ${activeCount}`}
    </Button>
    <section ref={popup} id={id} popover="auto" role="dialog" aria-labelledby={`${id}-title`} className="geography-filter-popup"
      onToggle={event => { const visible = event.newState === 'open'; setOpen(visible); if (visible) { position(); popup.current?.querySelector<HTMLSelectElement>('select:not(:disabled)')?.focus({ preventScroll: true }); } }}
      onKeyDownCapture={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); popup.current?.hidePopover(); trigger.current?.focus({ preventScroll: true }); } }}>
      <header><h2 id={`${id}-title`}>Lọc theo địa bàn</h2><Button type="button" variant="ghost" size="icon" aria-label="Đóng bộ lọc địa bàn" onClick={() => { popup.current?.hidePopover(); trigger.current?.focus({ preventScroll: true }); }}><X size={16} aria-hidden="true" /></Button></header>
      <div className="geography-filter-popup-body">{fields}{open && errorContent}</div>
    </section>
    {activeCount > 0 && <div className="geography-filter-summary"><span role="status" title={selectedLabels}>{selectedLabels || (options ? 'Địa bàn đã chọn' : 'Đang tải địa bàn…')}</span><Button type="button" variant="ghost" size="sm" onClick={() => onChange({})}>Xóa</Button></div>}
    {!open && errorContent}
  </>;
}
