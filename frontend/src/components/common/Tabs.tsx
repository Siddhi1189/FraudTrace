import React from 'react';
import styles from './Tabs.module.css';

export interface TabItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeKey,
  onChange,
  className = '',
}) => {
  return (
    <div className={`${styles.tabList} ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            className={`${styles.tabButton} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
