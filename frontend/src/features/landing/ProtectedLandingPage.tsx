import React, { useEffect, useState } from 'react';
import { useAuth } from '../../app/AuthContext';
import { apiRequest } from '../../api/client';
import styles from './ProtectedLandingPage.module.css';

interface HealthData {
  status: string;
  database: string;
  timestamp: string;
}

export const ProtectedLandingPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    apiRequest<HealthData>('/api/health')
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: 'unavailable', database: 'disconnected', timestamp: '' }));
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.navbar}>
        <div className={styles.brand}>
          <div className={styles.logoDot} />
          <span className={styles.brandName}>FraudTrace</span>
        </div>

        <div className={styles.navRight}>
          <div className={styles.userBadge}>
            <span className={styles.roleTag}>{user?.role}</span>
            <span className={styles.userName}>{user?.name}</span>
          </div>
          <button onClick={logout} className={styles.logoutBtn}>
            Sign Out
          </button>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.welcomeCard}>
          <div className={styles.welcomeHeader}>
            <span className={styles.phaseBadge}>Phase 1 · Foundation Verified</span>
            <h1 className={styles.heading}>Analyst Investigation Session Active</h1>
            <p className={styles.lead}>
              Authentication and security verification established. The core MERN stack, MongoDB connection,
              and authenticated session context are fully initialized.
            </p>
          </div>

          <div className={styles.grid}>
            <div className={styles.infoTile}>
              <div className={styles.tileLabel}>Authenticated User</div>
              <div className={styles.tileValue}>{user?.email}</div>
            </div>

            <div className={styles.infoTile}>
              <div className={styles.tileLabel}>Assigned Role</div>
              <div className={styles.tileValue}>{user?.role}</div>
            </div>

            <div className={styles.infoTile}>
              <div className={styles.tileLabel}>System Health</div>
              <div className={styles.tileValue}>
                <span className={styles.statusIndicator}>
                  <span className={styles.statusDot} />
                  <span>{health ? `${health.status} (${health.database})` : 'Checking...'}</span>
                </span>
              </div>
            </div>

            <div className={styles.infoTile}>
              <div className={styles.tileLabel}>User Identifier</div>
              <div className={styles.tileValue}>{user?._id}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
