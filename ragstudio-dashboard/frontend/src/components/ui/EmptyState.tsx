import { Database } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { Button } from './Button';
import type { ComponentType } from 'react';
type LucideIcon = ComponentType<LucideProps>;

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon = Database, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center" style={{ color: 'var(--text-muted)' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
        <Icon className="w-8 h-8" style={{ opacity: 0.6 }} />
      </div>
      <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {description && <p className="text-sm max-w-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>{description}</p>}
      {actionLabel && onAction && <Button variant="default" size="sm" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

export function MetricSkeleton() {
  return (
    <div className="p-4 rounded-xl animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
      <div className="h-4 w-24 rounded mb-3" style={{ background: 'var(--bg-tertiary)' }} />
      <div className="h-8 w-16 rounded mb-2" style={{ background: 'var(--bg-tertiary)' }} />
      <div className="h-3 w-32 rounded" style={{ background: 'var(--bg-tertiary)' }} />
    </div>
  );
}
