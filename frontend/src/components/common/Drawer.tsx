import React, { useEffect } from 'react';
import styles from './Drawer.module.css';
import { Icon } from './Icons';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <aside
        className={styles.drawer}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close drawer"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </aside>
    </div>
  );
};
