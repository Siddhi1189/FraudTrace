import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { Icon, IconName } from './common/Icons';
import { Button } from './common/Button';
import styles from './AppLayout.module.css';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/alerts', label: 'Alerts', icon: 'alerts' },
  { to: '/rings', label: 'Rings', icon: 'rings' },
  { to: '/graph', label: 'Graph', icon: 'graph' },
  { to: '/cases', label: 'Cases', icon: 'cases' },
  { to: '/data', label: 'Data', icon: 'data' },
  { to: '/rules', label: 'Rules', icon: 'rules' },
];

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Derive simple breadcrumb or title from path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/cases/')) return 'Case Investigation Workspace';
    if (path === '/cases') return 'Cases Directory';
    if (path.startsWith('/rings/')) return 'Fraud Ring Details';
    if (path === '/rings') return 'Fraud Rings Directory';
    if (path.startsWith('/accounts/')) return 'Account Investigation';
    if (path === '/dashboard') return 'Operational Dashboard';
    if (path === '/alerts') return 'Alerts Investigation Queue';
    if (path === '/graph') return 'Graph Network Explorer';
    if (path === '/data') return 'Data Management & Ingestion';
    if (path === '/rules') return 'Detection & Engine Rules';
    return 'FraudTrace Workstation';
  };

  return (
    <div className={styles.shell}>
      {/* 240px Left Navigation Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.brand}>
          {!collapsed && <span className={styles.brandTitle}>FraudTrace</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={styles.collapseToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={14} />
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''} ${
                  collapsed ? styles.navLinkCollapsed : ''
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon name={item.icon} size={15} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {!collapsed && (
          <div className={styles.sidebarFooter}>
            <span>Workstation v1</span>
          </div>
        )}
      </aside>

      {/* Main Content Column */}
      <div className={styles.mainWrapper}>
        {/* Slim Top Bar */}
        <header className={styles.topBar}>
          <div className={styles.pageTitle}>{getPageTitle()}</div>

          <div className={styles.userSection}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name || 'Analyst'}</span>
              <span className={styles.userRole}>({user?.role || 'ANALYST'})</span>
            </div>
            <Button variant="ghost" compact onClick={logout} aria-label="Sign out">
              <Icon name="logout" size={13} />
              <span>Sign out</span>
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <main className={styles.contentArea}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
