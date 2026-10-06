import React from 'react';
import styles from './StateView.module.css';
import { Button } from './Button';
import { Icon } from './Icons';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There are no active records matching the current criteria.',
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.emptyTitle}>{title}</div>
      <div className={styles.emptyDescription}>{description}</div>
      {actionText && onAction && (
        <Button variant="secondary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'An error occurred while loading investigation data.',
  onRetry,
  className = '',
}) => {
  const isForbidden =
    message.toLowerCase().includes('permission') ||
    message.toLowerCase().includes('forbidden') ||
    message.includes('403');

  return (
    <div className={`${styles.errorBox} ${className}`}>
      <div className={styles.errorTitle}>
        <Icon name="error" size={14} />
        <span>{isForbidden ? 'Permission Denied' : 'Failed to load data'}</span>
      </div>
      <div>
        {isForbidden
          ? 'You do not have permission to view or modify this resource.'
          : message}
      </div>
      {onRetry && !isForbidden && (
        <div style={{ marginTop: '8px' }}>
          <Button variant="secondary" compact onClick={onRetry}>
            Retry Request
          </Button>
        </div>
      )}
    </div>
  );
};

export const LoadingState: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className={styles.loadingSkeleton}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={styles.skeletonLine}
          style={{ width: `${Math.max(40, 100 - i * 15)}%` }}
        />
      ))}
    </div>
  );
};

export interface StateViewProps {
  type: 'loading' | 'empty' | 'error';
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export const StateView: React.FC<StateViewProps> = ({
  type,
  title,
  description,
  onRetry,
  className = '',
}) => {
  if (type === 'loading') {
    return (
      <div className={`${styles.container} ${className}`}>
        <LoadingState rows={4} />
        {title && <div style={{ marginTop: '8px', color: 'var(--text-3)', fontSize: '11px' }}>{title}</div>}
      </div>
    );
  }
  if (type === 'error') {
    return <ErrorState message={description || title} onRetry={onRetry} className={className} />;
  }
  return <EmptyState title={title} description={description} className={className} />;
};
