import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  compact?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  compact = false,
  fullWidth = false,
  className = '',
  style,
  children,
  ...props
}) => {
  const classes = [
    styles.button,
    styles[variant],
    compact ? styles.compact : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const mergedStyle: React.CSSProperties = {
    ...(fullWidth ? { width: '100%' } : {}),
    ...style,
  };

  return (
    <button className={classes} style={mergedStyle} {...props}>
      {children}
    </button>
  );
};
