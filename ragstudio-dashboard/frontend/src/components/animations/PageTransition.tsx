import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useReducedMotion } from '../themes/ThemeProvider';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const pageTransition = {
  type: 'spring' as const,
  damping: 25,
  stiffness: 300,
  duration: 0.3,
};

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't animate on first mount or if reduced motion
  if (!mounted || prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className={className}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        style={{ position: 'relative', width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Staggered children animation
export function StaggerContainer({ children, className = '', delay = 0.1 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '', delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: {
          opacity: 1,
          y: 0,
          transition: { type: 'spring', damping: 20, stiffness: 300, delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Fade in/out for modals, tooltips, etc.
export function FadeTransition({ children, show, className = '', mode = 'wait' }: {
  children: React.ReactNode;
  show: boolean;
  className?: string;
  mode?: 'wait' | 'popLayout';
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return show ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence mode={mode}>
      {show && (
        <motion.div
          className={className}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Slide transition for sidebars, drawers
export function SlideTransition({
  children,
  show,
  direction = 'left',
  className = '',
}: {
  children: React.ReactNode;
  show: boolean;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  const getTransform = (dir: string) => {
    switch (dir) {
      case 'left': return { x: -300 };
      case 'right': return { x: 300 };
      case 'top': return { y: -300 };
      case 'bottom': return { y: 300 };
    }
  };

  if (prefersReducedMotion) {
    return show ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          className={className}
          initial={getTransform(direction)}
          animate={{ x: 0, y: 0 }}
          exit={getTransform(direction)}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Scale transition for buttons, cards
export function ScaleTransition({ children, className = '', hoverScale = 1.02, tapScale = 0.98 }: {
  children: React.ReactElement;
  className?: string;
  hoverScale?: number;
  tapScale?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return React.cloneElement(children, { className: `${children.props.className || ''} ${className}` });
  }

  return (
    <motion.div
      className={className}
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: tapScale }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.div>
  );
}

// Magnetic button effect
export function MagneticButton({
  children,
  className = '',
  strength = 0.3,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const ref = React.useRef<HTMLButtonElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    if (prefersReducedMotion || !ref.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = ref.current!.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      setPosition({ x: x * strength, y: y * strength });
    };

    const handleMouseLeave = () => {
      setPosition({ x: 0, y: 0 });
    };

    ref.current.addEventListener('mousemove', handleMouseMove);
    ref.current.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      ref.current?.removeEventListener('mousemove', handleMouseMove);
      ref.current?.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength, prefersReducedMotion]);

  return (
    <button
      ref={ref}
      className={className}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: prefersReducedMotion ? 'none' : 'transform 0.15s ease-out',
        ...props.style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

// Shine effect on hover
export function ShineEffect({ children, className = '', ...props }: {
  children: React.ReactNode;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => !prefersReducedMotion && setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      {...props}
    >
      {children}
      {!prefersReducedMotion && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            transform: isHovering ? 'translateX(100%)' : 'translateX(-100%)',
          }}
          animate={{ transform: isHovering ? 'translateX(100%)' : 'translateX(-100%)' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}

// Tilt effect for cards
export function TiltCard({
  children,
  className = '',
  maxTilt = 5,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  React.useEffect(() => {
    if (prefersReducedMotion || !ref.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = ref.current!.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = (e.clientY - centerY) / (rect.height / 2) * maxTilt;
      const y = (centerX - e.clientX) / (rect.width / 2) * maxTilt;
      setTilt({ x, y });
    };

    const handleMouseLeave = () => {
      setTilt({ x: 0, y: 0 });
    };

    ref.current.addEventListener('mousemove', handleMouseMove);
    ref.current.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      ref.current?.removeEventListener('mousemove', handleMouseMove);
      ref.current?.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [maxTilt, prefersReducedMotion]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: prefersReducedMotion ? 'none' : `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: prefersReducedMotion ? 'none' : 'transform 0.1s ease-out',
        transformStyle: 'preserve-3d',
        ...props.style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

// Loading spinner with theme support
export function LoadingSpinner({ size = 24, className = '' }: { size?: number; className?: string }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      style={{ width: size, height: size }}
      animate={{ rotate: prefersReducedMotion ? 0 : 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ color: 'var(--accent-primary)' }}>
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
          style={{ opacity: 0.3 }}
        />
        <motion.path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          animate={{ strokeDashoffset: [0, -31.4] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </motion.div>
  );
}

// Skeleton loader
export function Skeleton({ className = '', width = '100%', height = '1rem', variant = 'text' }: {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
}) {
  const prefersReducedMotion = useReducedMotion();

  const borderRadius = variant === 'circular' ? '50%' : variant === 'rectangular' ? '8px' : '4px';

  return (
    <motion.div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%)',
        backgroundSize: '200% 100%',
      }}
      animate={{ backgroundPosition: prefersReducedMotion ? '0%' : ['200%', '-200%'] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
    />
  );
}

// Progress bar with animation
export function ProgressBar({ value = 0, className = '', showLabel = false }: {
  value: number;
  className?: string;
  showLabel?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`w-full h-2 rounded-full overflow-hidden ${className}`} style={{ background: 'var(--bg-tertiary)' }}>
      <motion.div
        className="h-full rounded-full"
        style={{
          background: 'var(--accent-primary)',
          width: `${Math.max(0, Math.min(100, value))}%`,
          boxShadow: 'var(--shadow-glow)',
        }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: prefersReducedMotion ? 0.01 : 0.5, ease: 'easeOut' }}
      />
      {showLabel && (
        <div className="text-xs mt-1 text-right" style={{ color: 'var(--text-tertiary)' }}>
          {Math.round(value)}%
        </div>
      )}
    </div>
  );
}

// Toast notification
export function Toast({
  message,
  type = 'info',
  onClose,
  duration = 5000,
}: {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, prefersReducedMotion ? 0 : 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose, prefersReducedMotion]);

  const icons = {
    success: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    error: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
    warning: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    info: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  };

  const colors = {
    success: 'var(--accent-success)',
    error: 'var(--accent-error)',
    warning: 'var(--accent-warning)',
    info: 'var(--accent-primary)',
  };

  return (
    <motion.div
      className="toast flex items-center gap-3 px-4 py-3 rounded-xl glass-strong"
      style={{
        borderLeft: `4px solid ${colors[type]}`,
        boxShadow: 'var(--shadow-xl)',
      }}
      initial={{ opacity: 0, x: 300, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      onAnimationComplete={() => !visible && onClose()}
    >
      <div style={{ color: colors[type] }}>{icons[type]}</div>
      <div className="flex-1" style={{ color: 'var(--text-primary)' }}>{message}</div>
      <button
        onClick={() => setVisible(false)}
        className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
}

// Toast container
export function ToastContainer() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
          style={{ pointerEvents: 'auto' }}
        />
      ))}
    </div>
  );
}

// Hook for toast
export function useToast() {
  const [, setToasts] = useState(0); // Force re-render

  const toast = React.useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    // This would be implemented with a context in a real app
    console.log(`Toast: ${type} - ${message}`);
  }, []);

  return { toast };
}