import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  compact?: boolean; // legacy alias for size='sm'
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'secondary',
  size = 'md',
  compact = false,
  fullWidth = false,
  className = '',
  children,
  type = 'button',
  ...props
}, ref) => {
  const resolvedSize = compact ? 'sm' : size;
  const classes = [
    styles.btn,
    styles[variant],
    styles[resolvedSize],
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} type={type} className={classes} {...props}>
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export interface LinkButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to?: string;
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  compact?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(({
  to,
  href,
  variant = 'secondary',
  size = 'md',
  compact = false,
  fullWidth = false,
  className = '',
  children,
  ...props
}, ref) => {
  const resolvedSize = compact ? 'sm' : size;
  const classes = [
    styles.btn,
    styles[variant],
    styles[resolvedSize],
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a ref={ref} href={href} className={classes} {...props}>
      {children}
    </a>
  );
});

LinkButton.displayName = 'LinkButton';
