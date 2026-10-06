import React from 'react';
import { Icon } from './common/Icons';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  children,
  actions,
  className = '',
}) => {
  return (
    <div className={`${styles.filterBar} ${className}`}>
      {onSearchChange !== undefined && (
        <div className={styles.searchBox}>
          <Icon name="search" size={14} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className={styles.searchInput}
            aria-label={searchPlaceholder}
          />
        </div>
      )}

      {children && <div className={styles.filtersGroup}>{children}</div>}
      {actions && <div className={styles.filtersGroup}>{actions}</div>}
    </div>
  );
};
