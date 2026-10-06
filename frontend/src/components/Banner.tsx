import React from 'react';
import styles from './Banner.module.css';

interface BannerProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error' | 'neutral';
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const Banner: React.FC<BannerProps> = ({
  children,
  variant = 'info',
  title,
  action,
  className = '',
}) => {
  return (
    <div className={`${styles.banner} ${styles[variant]} ${className}`} role="status">
      <div className={styles.content}>
        {title && <strong style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>{title}</strong>}
        {children}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
