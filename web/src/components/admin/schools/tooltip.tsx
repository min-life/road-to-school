'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { InfoIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const show = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setPortalHost(triggerRef.current?.closest('dialog') ?? document.body);
    setIsVisible(true);
  };
  const hideAfterHover = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      if (document.activeElement !== triggerRef.current) setIsVisible(false);
    }, 120);
  };

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  useLayoutEffect(() => {
    if (!isVisible) return;
    const position = () => {
      const trigger = triggerRef.current;
      const tooltip = tooltipRef.current;
      if (!trigger || !tooltip) return;
      const anchor = trigger.getBoundingClientRect();
      tooltip.style.maxWidth = `${Math.min(288, window.innerWidth - 16)}px`;
      const bounds = tooltip.getBoundingClientRect();
      const left = Math.max(8, Math.min(anchor.left + anchor.width / 2 - bounds.width / 2, window.innerWidth - bounds.width - 8));
      const top = anchor.top >= bounds.height + 14 ? anchor.top - bounds.height - 6 : anchor.bottom + 6;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${Math.max(8, Math.min(top, window.innerHeight - bounds.height - 8))}px`;
    };
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [isVisible, content, portalHost]);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible]);

  return (
    <div className={`relative inline-flex items-center ${className}`} onMouseEnter={show} onMouseLeave={hideAfterHover}>
      <Button
        ref={triggerRef}
        type="button"
        aria-label="Thông tin hướng dẫn"
        aria-expanded={isVisible}
        aria-describedby={isVisible ? tooltipId : undefined}
        onFocus={show}
        onBlur={() => setIsVisible(false)}
        onClick={show}
        onKeyDown={event => {
          if (event.key === 'Escape' && isVisible) {
            event.preventDefault();
            event.stopPropagation();
            setIsVisible(false);
          }
        }}
        className="p-0.5 rounded-full text-slate-400 hover:text-amber-600 hover:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-colors cursor-pointer"
      >
        {children || <InfoIcon className="w-3.5 h-3.5" />}
      </Button>

      {isVisible && portalHost && createPortal(
        <div
          id={tooltipId}
          ref={tooltipRef}
          role="tooltip"
          onMouseEnter={show}
          onMouseLeave={hideAfterHover}
          className="fixed z-60 w-max px-2.5 py-1.5 bg-slate-900 text-white text-[11px] leading-tight rounded-lg shadow-lg break-words"
        >
          {content}
        </div>,
        portalHost,
      )}
    </div>
  );
}
