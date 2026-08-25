import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../themes/ThemeProvider';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
}: ModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Focus the modal content or close button
      setTimeout(() => {
        contentRef.current?.focus();
      }, 0);

      // Trap focus
      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const focusableElements = contentRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (!focusableElements?.length) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      };

      document.addEventListener('keydown', handleTab);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleTab);
        document.body.style.overflow = '';
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        className="modal-overlay"
        onClick={closeOnOverlayClick ? onClose : undefined}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: prefersReducedMotion ? 0.01 : 0.2 }}
        role="presentation"
      >
        <motion.div
          ref={contentRef}
          className={`modal-content ${sizeClasses[size]} ${className}`}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
              <div>
                {title && (
                  <h2 id="modal-title" className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="modal-description" className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-lg flex-shrink-0 transition-colors"
                  style={{ color: 'var(--text-tertiary)', background: 'transparent', border: 'none' }}
                  whileHover={{ scale: 1.1, backgroundColor: 'var(--bg-tertiary)' }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Close modal"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </motion.button>
              )}
            </div>
          )}

          <div className="max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Confirmation Modal
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  loading = false,
}: ConfirmModalProps) {
  const variantStyles = {
    danger: 'bg-[var(--accent-error)] hover:bg-[var(--accent-error)]/90',
    primary: 'bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)]',
    warning: 'bg-[var(--accent-warning)] hover:bg-[var(--accent-warning)]/90',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>{message}</p>

      <div className="flex justify-end gap-3">
        <motion.button
          onClick={onClose}
          disabled={loading}
          className="btn-secondary px-4 py-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {cancelText}
        </motion.button>

        <motion.button
          onClick={onConfirm}
          disabled={loading}
          className={`btn px-4 py-2 ${variantStyles[variant]}`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <>
              <motion.svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" style={{opacity:0.3}}/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </motion.svg>
              Processing...
            </>
          ) : (
            confirmText
          )}
        </motion.button>
      </div>
    </Modal>
  );
}

// Form Modal Base
interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  title: string;
  description?: string;
  children: React.ReactNode;
  submitText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
}

export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  children,
  submitText = 'Save',
  size = 'md',
  loading = false,
}: FormModalProps) {
  const [formData, setFormData] = React.useState<Record<string, unknown>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setErrors({ form: error.message });
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement, {
                value: formData[child.props.name as string],
                error: errors[child.props.name as string],
                onChange: (value: unknown) => {
                  setFormData(prev => ({ ...prev, [child.props.name as string]: value }));
                  if (errors[child.props.name as string]) {
                    setErrors(prev => { const next = { ...prev }; delete next[child.props.name as string]; return next; });
                  }
                },
              });
            }
            return child;
          })}
        </div>

        {errors.form && (
          <motion.p
            className="mt-4 p-3 rounded-lg text-sm"
            style={{ background: 'var(--accent-error)/10', color: 'var(--accent-error)', border: '1px solid var(--accent-error)/30' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {errors.form}
          </motion.p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <motion.button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary px-4 py-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>

          <motion.button
            type="submit"
            disabled={loading}
            className="btn-primary px-4 py-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <>
                <motion.svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" style={{opacity:0.3}}/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </motion.svg>
                Saving...
              </>
            ) : (
              submitText
            )}
          </motion.button>
        </div>
      </form>
    </Modal>
  );
}