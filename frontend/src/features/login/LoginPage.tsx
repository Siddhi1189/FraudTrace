import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { Card } from '../../components/Card';
import { Field } from '../../components/Field';
import { Button, LinkButton } from '../../components/common/Button';
import { Banner } from '../../components/Banner';
import { Icon } from '../../components/common/Icons';
import { Wordmark } from '../../components/Wordmark';
import { Container } from '../../components/Container';
import styles from './LoginPage.module.css';

/**
 * Single-card centered analyst workspace authentication.
 * Follows UI Fixes Round 3 Item 7 specification:
 * - Shared sticky header with Wordmark left, Back to home right
 * - One vertically and horizontally centered Card (max-width 460px, padding 40px)
 * - Initial empty states, zero hardcoded credentials, zero signup links
 */
export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { error?: string } } }).response;
        if (res?.data?.error) {
          setError(res.data.error);
        } else {
          setError('Authentication failed. Please verify your credentials.');
        }
      } else {
        setError('Unable to connect to the authentication server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Header matching public site: Wordmark left, Back to home right */}
      <header className={styles.header}>
        <Container className={styles.headerContainer}>
          <Wordmark to="/" />
          <LinkButton to="/" variant="ghost" size="sm">
            ← Back to home
          </LinkButton>
        </Container>
      </header>

      {/* Main area: vertically and horizontally centered card */}
      <main className={styles.main}>
        <Container className={styles.mainContainer}>
          <Card className={styles.loginCard}>
            <div className={styles.cardHeader}>
              <div className={styles.kicker}>SIGN IN</div>
              <h1 className={styles.title}>Sign in to FraudTrace</h1>
              <p className={styles.subtitle}>
                Analyst workspace on synthetic demo data.
              </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <Field label="Email address" htmlFor="email" required className={styles.field}>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@fraudtrace.local"
                  className={styles.input}
                />
              </Field>

              <Field label="Password" htmlFor="password" required className={styles.field}>
                <div className={styles.passwordWrapper}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={styles.input}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className={styles.passwordToggle}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} size={14} />
                  </button>
                </div>
              </Field>

              {error && (
                <Banner variant="error" className={styles.banner}>
                  {error}
                </Banner>
              )}

              <div className={styles.buttonWrapper}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Authenticating...' : 'Sign in to workspace →'}
                </Button>
              </div>
            </form>
          </Card>
        </Container>
      </main>

      {/* Footer line */}
      <footer className={styles.footer}>
        <Container>
          <div className={styles.footerNote}>
            Synthetic demo data · Risk scores are investigative signals, not legal determinations.
          </div>
        </Container>
      </footer>
    </div>
  );
};

export default LoginPage;
