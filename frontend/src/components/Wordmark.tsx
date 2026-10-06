import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Wordmark.module.css';

export interface WordmarkProps {
  collapsed?: boolean;
  to?: string;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

/**
 * Unified Wordmark component across all public and internal screens.
 * Uses --wordmark-size token (26px, 24px under 640px), EB Garamond 600, -0.01em tracking, line-height 1.
 * When collapsed (56px sidebar), renders "FT" at 22px in the same font and weight.
 */
export const Wordmark: React.FC<WordmarkProps> = ({
  collapsed = false,
  to,
  href,
  onClick,
  className = '',
}) => {
  const content = collapsed ? 'FT' : 'FraudTrace';
  const combinedClass = `${styles.wordmark} ${collapsed ? styles.collapsed : ''} ${className}`;

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={combinedClass}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} onClick={onClick} className={combinedClass}>
        {content}
      </a>
    );
  }

  return (
    <span onClick={onClick} className={combinedClass}>
      {content}
    </span>
  );
};

export default Wordmark;
