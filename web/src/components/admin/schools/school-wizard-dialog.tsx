'use client';

import React from 'react';
import { CloseIcon, AlertIcon } from '@/components/icons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import './school-wizard.css';

export interface SchoolWizardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  titleId?: string;
  step: number;
  steps: string[];
  onStepChange: (step: number) => void;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  formRef?: React.RefObject<HTMLFormElement | null>;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function SchoolWizardDialog({
  isOpen,
  onClose,
  title,
  description,
  titleId = 'school-wizard-dialog-title',
  step,
  steps,
  onStepChange,
  errorMessage,
  isSubmitting = false,
  onSubmit,
  formRef,
  children,
  footer,
}: SchoolWizardDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      {/* Modal Dialog Container */}
      <Card className="school-wizard-dialog ui-dialog-panel ui-dialog-panel-body relative w-full flex flex-col bg-white rounded-2xl shadow-2xl z-10 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="school-wizard-header flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-slate-800">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
          <Button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng biểu mẫu"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Stepper Navigation */}
        <nav
          className="school-wizard-navigation"
          aria-label={`Các bước ${title.toLowerCase()}`}
        >
          <ol>
            {steps.map((label, index) => {
              const stepNumber = index + 1;
              const isCurrent = step === stepNumber;
              return (
                <li key={label}>
                  <button
                    type="button"
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-controls={`school-wizard-panel-${stepNumber}`}
                    disabled={isSubmitting}
                    onClick={() => onStepChange(stepNumber)}
                  >
                    <span
                      className="school-wizard-step-number"
                      aria-hidden="true"
                    >
                      {stepNumber}
                    </span>
                    <span>{label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Form Body: Inactive sections stay mounted to preserve image/map/form state */}
        <form
          ref={formRef}
          onSubmit={onSubmit}
          tabIndex={-1}
          aria-label={`Bước ${step}: ${steps[step - 1] || ''}`}
          className="school-wizard-form ui-dialog-body flex-1 overflow-y-auto space-y-6"
        >
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
              <AlertIcon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}
          {children}
        </form>

        {/* Footer */}
        <div className="school-wizard-footer flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
          {footer}
        </div>
      </Card>
    </div>
  );
}
