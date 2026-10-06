import React from 'react';
import styles from './Field.module.css';

interface FieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  htmlFor,
  required = false,
  error,
  helperText,
  children,
  className = '',
}) => {
  return (
    <div className={`${styles.fieldWrapper} ${className}`}>
      {label && (
        <div className={styles.labelRow}>
          <label htmlFor={htmlFor} className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
        </div>
      )}

      {children}

      {error ? (
        <span className={styles.errorText} role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span className={styles.helperText}>{helperText}</span>
      ) : null}
    </div>
  );
};
