import { useEffect, useState } from 'react';
import type { FC, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPTS_STORAGE_KEY = 'secure-task-login-attempts';

type LoginAttempts = Record<string, number[]>;

const getLoginAttempts = (email: string): number[] => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return [];

  const storedAttempts = localStorage.getItem(LOGIN_ATTEMPTS_STORAGE_KEY);
  if (!storedAttempts) return [];

  try {
    const attempts = JSON.parse(storedAttempts) as LoginAttempts;
    return (attempts[normalizedEmail] || [])
      .filter((timestamp) => Date.now() - timestamp < LOGIN_WINDOW_MS);
  } catch {
    localStorage.removeItem(LOGIN_ATTEMPTS_STORAGE_KEY);
    return [];
  }
};

const saveLoginAttempt = (email: string): number[] => {
  const normalizedEmail = email.trim().toLowerCase();
  const recentAttempts = getLoginAttempts(normalizedEmail);
  const updatedAttempts = [...recentAttempts, Date.now()];
  const storedAttempts = localStorage.getItem(LOGIN_ATTEMPTS_STORAGE_KEY);
  const attempts = storedAttempts ? JSON.parse(storedAttempts) as LoginAttempts : {};

  localStorage.setItem(
    LOGIN_ATTEMPTS_STORAGE_KEY,
    JSON.stringify({ ...attempts, [normalizedEmail]: updatedAttempts })
  );

  return updatedAttempts;
};

const clearLoginAttempts = (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const storedAttempts = localStorage.getItem(LOGIN_ATTEMPTS_STORAGE_KEY);
  if (!storedAttempts) return;

  const attempts = JSON.parse(storedAttempts) as LoginAttempts;
  delete attempts[normalizedEmail];
  localStorage.setItem(LOGIN_ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts));
};

const LoginPage: FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutEmail, setLockoutEmail] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const normalizedEmail = email.trim().toLowerCase();
  const storedAttempts = getLoginAttempts(email);
  const storedLockoutUntil = storedAttempts.length >= LOGIN_ATTEMPT_LIMIT
    ? storedAttempts[storedAttempts.length - LOGIN_ATTEMPT_LIMIT] + LOGIN_WINDOW_MS
    : null;
  const activeLockoutUntil = lockoutEmail === normalizedEmail && lockoutUntil
    ? lockoutUntil
    : storedLockoutUntil;

  useEffect(() => {
    if (!activeLockoutUntil) return;

    const timer = window.setTimeout(() => {
      setLockoutUntil(null);
      setLockoutEmail('');
      setError('');
    }, Math.max(0, activeLockoutUntil - Date.now()));

    return () => window.clearTimeout(timer);
  }, [activeLockoutUntil]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const recentAttempts = getLoginAttempts(email);
    if (recentAttempts.length >= LOGIN_ATTEMPT_LIMIT) {
      setLockoutEmail(normalizedEmail);
      setLockoutUntil(recentAttempts[recentAttempts.length - LOGIN_ATTEMPT_LIMIT] + LOGIN_WINDOW_MS);
      setError('Too many failed login attempts. Please try again in 15 minutes.');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      clearLoginAttempts(email);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string }; status?: number };
      };

      if (axiosErr?.response?.status === 429) {
        setError(
          axiosErr.response.data?.message ||
          'Too many login attempts. Please try again in 15 minutes.'
        );
      } else {
        const attempts = saveLoginAttempt(email);
        const remainingAttempts = LOGIN_ATTEMPT_LIMIT - attempts.length;
        if (remainingAttempts <= 0) {
          setLockoutEmail(normalizedEmail);
          setLockoutUntil(attempts[attempts.length - LOGIN_ATTEMPT_LIMIT] + LOGIN_WINDOW_MS);
          setError('Too many failed login attempts. Please try again in 15 minutes.');
        } else {
          setError(
            axiosErr?.response?.data?.message ||
            `Login failed. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining in the next 15 minutes.`
          );
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container fade-in">
        <section className="login-welcome" aria-label="Welcome">
          <div className="welcome-shape welcome-shape-one" />
          <div className="welcome-shape welcome-shape-two" />
          <div className="welcome-shape welcome-shape-three" />
          <div className="welcome-content">
            <div className="login-logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L4 6V12C4 16.4183 7.58172 20 12 22C16.4183 20 20 12V6L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(255,255,255,0.2)"/>
                <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="welcome-kicker">Welcome to</p>
            <h1>SecureTask Portal</h1>
            <p className="welcome-copy">Organize your work, collaborate with your team, and stay on track.</p>
          </div>
        </section>

        <section className="login-form-panel">
          <div className="login-header">
            <h2 className="login-title">Sign in</h2>
            <p className="login-subtitle">Enter your details to access your workspace</p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input
                id="email"
                type="email"
                className="form-input input-with-icon"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input input-with-icon input-with-action"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading || activeLockoutUntil !== null}
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading || activeLockoutUntil !== null}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="btn-login"
            className="btn btn-primary btn-full"
            disabled={isLoading || activeLockoutUntil !== null}
          >
            {isLoading ? (
              <>
                <span className="spinner" />
                Signing in...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                Sign In
              </>
            )}
          </button>
          </form>

          <p className="login-footer">
            Protected by secure JWT authentication
          </p>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
