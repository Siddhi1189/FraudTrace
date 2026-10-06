import React from 'react';
import styles from './Card.module.css';

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  children: React.ReactNode;
  variant?: 'default' | 'interactive' | 'flat';
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  noPadding?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  title,
  subtitle,
  actions,
  noPadding = false,
  className = '',
  ...rest
}) => {
  const isInteractive = variant === 'interactive';

  return (
    <div
      className={`${styles.card} ${isInteractive ? styles.interactive : ''} ${
        variant === 'flat' ? styles.flat : ''
      } ${className}`}
      tabIndex={isInteractive ? (rest.tabIndex ?? 0) : undefined}
      {...rest}
    >
      {(title || actions) && (
        <div className={styles.header}>
          <div>
            {typeof title === 'string' ? <h2 className={styles.title}>{title}</h2> : title}
            {subtitle && (
              typeof subtitle === 'string' ? <p className={styles.subtitle}>{subtitle}</p> : subtitle
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className={noPadding ? styles.bodyNoPadding : styles.body}>
        {children}
      </div>
    </div>
  );
};
