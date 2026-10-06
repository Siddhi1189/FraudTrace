import React from 'react';
import { Skeleton } from './Skeleton';

export const PageSkeletonFallback: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        width: '100%',
        padding: 'var(--space-6)',
        boxSizing: 'border-box',
      }}
      aria-label="Loading workstation view"
      role="status"
    >
      {/* Page Header skeleton shape matching kicker, Garamond title, and subtitle */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          paddingBottom: 'var(--space-6)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Skeleton width="120px" height="12px" />
        <Skeleton width="280px" height="36px" />
        <Skeleton width="440px" height="14px" />
      </div>

      {/* Metric Tiles skeleton row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <Skeleton height="100px" />
        <Skeleton height="100px" />
        <Skeleton height="100px" />
        <Skeleton height="100px" />
      </div>

      {/* Main content container skeleton */}
      <Skeleton height="320px" />
    </div>
  );
};
