import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { Button } from '../../components/common/Button';
import styles from './LoginPage.module.css';

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if redirected due to session expiry
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('expired') === 'true') {
      setError('Your session has ended. Sign in again.');
    }
  }, [location.search]);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const isSafeReturnUrl = (path: unknown): path is string => {
    return (
      typeof path === 'string' &&
      path.startsWith('/') &&
      !path.startsWith('//') &&
      !path.includes(':') &&
      path !== '/login'
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      const stateFrom = (location.state as { from?: string } | null)?.from;
      const searchParams = new URLSearchParams(location.search);
      const redirectParam = searchParams.get('redirect');
      const target = isSafeReturnUrl(stateFrom)
        ? stateFrom
        : isSafeReturnUrl(redirectParam)
          ? redirectParam
          : '/dashboard';
      navigate(target, { replace: true });
    } catch (err: unknown) {
      // Wrong credentials show generic message with no hint about user existence
      if (err && typeof err === 'object' && 'statusCode' in err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 401 || code === 400) {
          setError('Invalid email or password');
        } else {
          setError('Unable to connect to the authentication server. Please try again.');
        }
      } else {
        setError('Unable to connect to the authentication server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.brand}>Sign in</h1>
          <div className={styles.notice}>
            Analyst access only. Accounts are provided by an administrator.
          </div>
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              autoComplete="username"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${styles.input} ${styles.inputWithToggle}`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.toggleBtn}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <Button type="submit" variant="primary" disabled={isSubmitting} fullWidth>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className={styles.footer}>
          <span>FraudTrace Investigation Platform</span>
        </div>
      </div>
    </div>
  );
};
