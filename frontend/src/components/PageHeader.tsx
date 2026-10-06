import React from 'react';
import { Icon } from './common/Icons';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string; onClick?: () => void }>;
  onBack?: () => void;
  backLabel?: string;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  kicker,
  title,
  subtitle,
  breadcrumbs,
  onBack,
  backLabel = 'Back',
  badges,
  actions,
  className = '',
}) => {
  return (
    <div className={`${styles.headerContainer} ${className}`}>
      <div className={styles.titleArea}>
        {(breadcrumbs || onBack) && (
          <div className={styles.breadcrumbs}>
            {onBack && (
              <button type="button" className={styles.backBtn} onClick={onBack}>
                <Icon name="arrowLeft" size={12} />
                <span>{backLabel}</span>
              </button>
            )}
            {breadcrumbs && breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span aria-hidden="true">/</span>}
                {crumb.onClick ? (
                  <button type="button" className={styles.backBtn} onClick={crumb.onClick}>
                    {crumb.label}
                  </button>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {kicker && <div className={styles.kicker}>{kicker}</div>}

        <div className={styles.titleRow}>
          <h1 className={styles.title}>{title}</h1>
          {badges}
        </div>

        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
};
