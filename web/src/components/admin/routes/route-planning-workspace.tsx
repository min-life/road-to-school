'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import './route-planning-workspace.css';

/** Presentation only: the page owns all selections, requests and results. */
export function RoutePlanningWorkspace({ map, panel, footer, preview, configuration, panelLabel }: {
  map: ReactNode;
  panel: ReactNode;
  footer?: ReactNode;
  preview: boolean;
  configuration?: ReactNode;
  panelLabel?: string;
}) {
  const [mobileView, setMobileView] = useState<'panel' | 'map'>('panel');
  const workspaceRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    // Size from the actual header position rather than a fixed viewport offset.
    const resize = () => {
      const container = workspace.parentElement?.parentElement;
      const bottomSpace = Math.max(16, container ? parseFloat(getComputedStyle(container).paddingBottom) || 0 : 0);
      const height = `${Math.max(320, window.innerHeight - workspace.getBoundingClientRect().top - bottomSpace)}px`;
      if (workspace.style.getPropertyValue('--route-workspace-height') !== height) {
        workspace.style.setProperty('--route-workspace-height', height);
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (workspace.parentElement) observer.observe(workspace.parentElement);
    window.addEventListener('resize', resize);
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); };
  }, []);
  return (
    <section ref={workspaceRef} className={`route-workspace${footer ? '' : ' route-workspace-without-footer'}`} aria-label="Phương án tuyến" data-mobile-view={mobileView}>
      <div className="route-workspace-mobile-switch" aria-label="Chế độ xem">
        <button type="button" aria-pressed={mobileView === 'panel'} onClick={() => setMobileView('panel')}>{panelLabel ?? (preview ? 'Kết quả' : 'Thiết lập')}</button>
        <button type="button" aria-pressed={mobileView === 'map'} onClick={() => setMobileView('map')}>Bản đồ</button>
      </div>
      <div className="route-workspace-map">
        {map}
        {configuration && <aside className="route-workspace-map-config" aria-label="Thời gian lập tuyến">{configuration}</aside>}
      </div>
      <div className="route-workspace-panel">{panel}</div>
      {footer && <footer className="route-workspace-footer">{footer}</footer>}
    </section>
  );
}

export function PlanningTabs<T extends string>({ tabs, value, onChange, label = 'Nội dung lập tuyến' }: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  return <div className="route-workspace-tabs" role="tablist" aria-label={label}>
    {tabs.map((tab, index) => <button key={tab.value} type="button" role="tab"
      id={`planning-tab-${tab.value}`} aria-controls={`planning-panel-${tab.value}`}
      aria-selected={value === tab.value} tabIndex={value === tab.value ? 0 : -1}
      onClick={() => onChange(tab.value)}
      onKeyDown={event => {
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        onChange(tabs[next].value);
        (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
      }}>{tab.label}</button>)}
  </div>;
}
