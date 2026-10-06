import React, { useState, useMemo, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { Icon, IconName } from './common/Icons';
import { Button } from './common/Button';
import { fetchActiveRules } from '../api/analysisApi';
import { Wordmark } from './Wordmark';
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
  const [ruleVersion, setRuleVersion] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveRules()
      .then((data) => setRuleVersion(data.ruleVersion))
      .catch(() => {});
  }, []);

  // Derive active index for sliding indicator
  const activeIndex = useMemo(() => {
    const idx = NAV_ITEMS.findIndex((item) => location.pathname.startsWith(item.to));
    return idx >= 0 ? idx : 0;
  }, [location.pathname]);

  const getCurrentAreaName = () => {
    const path = location.pathname;
    if (path.startsWith('/cases/')) return 'Case Investigation';
    if (path === '/cases') return 'Cases';
    if (path.startsWith('/rings/')) return 'Ring Dossier';
    if (path === '/rings') return 'Fraud Rings';
    if (path.startsWith('/accounts/')) return 'Account Profile';
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/alerts') return 'Alerts';
    if (path === '/graph') return 'Graph Explorer';
    if (path === '/data') return 'Data Management';
    if (path === '/rules') return 'Rules & Thresholds';
    return 'Workspace';
  };

  const prefetchChunk = (to: string) => {
    switch (to) {
      case '/dashboard':
        import('../features/dashboard/DashboardPage');
        break;
      case '/alerts':
        import('../features/alerts/AlertsPage');
        break;
      case '/rings':
        import('../features/rings/RingsListPage');
        break;
      case '/graph':
        import('../features/graph/GraphExplorerPage');
        break;
      case '/cases':
        import('../features/cases/CasesListPage');
        break;
      case '/data':
        import('../features/data/DataManagementPage');
        break;
      case '/rules':
        import('../features/rules/RulesPage');
        break;
    }
  };

  return (
    <div className={styles.shell}>
      {/* 240px Left Navigation Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.brand}>
          <Wordmark collapsed={collapsed} to="/dashboard" />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={styles.collapseToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
          >
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={14} />
          </button>
        </div>

        <nav className={styles.nav} aria-label="Main Application Navigation">
          {/* Sliding indicator via transform only */}
          <div
            className={styles.navIndicator}
            style={{
              transform: `translateY(${activeIndex * 36}px)`,
              display: collapsed ? 'none' : 'block',
            }}
            aria-hidden="true"
          />

          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onMouseEnter={() => prefetchChunk(item.to)}
              onFocus={() => prefetchChunk(item.to)}
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
            <span>{ruleVersion ? `Engine ${ruleVersion}` : 'Deterministic Engine'}</span>
          </div>
        )}
      </aside>

      {/* Main Content Column */}
      <div className={styles.mainWrapper}>
        {/* Slim Top Bar: shows breadcrumbs/current area name, NOT repeating the h1 */}
        <header className={styles.topBar}>
          <div className={styles.breadcrumbBar}>
            <span className={styles.breadcrumbRoot}>FraudTrace</span>
            <span className={styles.breadcrumbDivider} aria-hidden="true">/</span>
            <span className={styles.currentArea}>{getCurrentAreaName()}</span>
          </div>

          <div className={styles.userSection}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name || user?.email || 'Analyst'}</span>
              <span className={styles.userRole}>({user?.role || 'ANALYST'})</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} aria-label="Sign out">
              <Icon name="logout" size={13} />
              <span>Sign out</span>
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <main key={location.pathname} className={styles.contentArea}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
