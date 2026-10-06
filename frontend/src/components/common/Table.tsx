import React from 'react';
import styles from './Table.module.css';

export interface Column<T> {
  key: string;
  title: React.ReactNode;
  width?: string | number;
  align?: 'left' | 'right' | 'center';
  render?: (row: T, index: number) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No records found.',
  className = '',
}: TableProps<T>) {
  return (
    <div className={`${styles.tableWrapper} ${className}`}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${styles.th} ${col.align === 'right' ? styles.tdNumber : ''}`}
                style={{
                  textAlign: col.align || 'left',
                  width: col.width,
                }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={styles.td}
                style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={keyExtractor(row, idx)}
                className={styles.tr}
                onClick={() => onRowClick && onRowClick(row)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`${styles.td} ${col.align === 'right' ? styles.tdNumber : ''}`}
                    style={{ textAlign: col.align || 'left' }}
                  >
                    {col.render ? col.render(row, idx) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
