import { useEffect, useState, useCallback } from 'react';
import type { FC, FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import './LoginPage.css';
import './RegisterPage.css';

const VerifyEmailPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [token, setToken] = useState(tokenParam);
  const [resendEmail, setResendEmail] = useState(emailParam);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [isResending, setIsResending] = useState(false);

  const performVerification = useCallback(async (tokenToVerify: string) => {
    if (!tokenToVerify) return;
    setIsLoading(true);
    setError('');

    try {
      const res = await authApi.verifyEmail(tokenToVerify);
      setIsSuccess(true);
      if (res.data.data?.token) {
        localStorage.setItem('authToken', res.data.data.token);
        localStorage.setItem('authUser', JSON.stringify(res.data.data.user));
      }
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Token verifikasi tidak valid atau telah kedaluwarsa.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (tokenParam) {
      void performVerification(tokenParam);
    }
  }, [tokenParam, performVerification]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Masukkan token verifikasi.');
      return;
    }
    void performVerification(token.trim());
  };

  const handleResend = async (e: FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      setError('Masukkan email Anda untuk mengirim ulang token.');
      return;
    }

    setIsResending(true);
    setResendSuccess('');
    setError('');

    try {
      const res = await authApi.resendVerification(resendEmail.trim());
      setResendSuccess(res.data.message || 'Token baru berhasil dikirimkan!');
      if (res.data.data?.previewToken) {
        setToken(res.data.data.previewToken);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Gagal mengirim token baru. Pastikan email terdaftar.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="login-page register-page">
      <div className="login-container fade-in" style={{ maxWidth: '580px' }}>
        <section className="login-form-panel" style={{ width: '100%', padding: '2.5rem' }}>
          <div className="verification-step-wrapper">
            <div className="verification-icon-badge">
              {isSuccess ? '🎉' : '🔐'}
            </div>

            <h2 className="login-title">
              {isSuccess ? 'Email Berhasil Diverifikasi!' : 'Aktivasi Akun Portal'}
            </h2>

            <p className="login-subtitle">
              {isSuccess
                ? 'Akun Anda telah aktif dan siap digunakan. Mengalihkan ke dashboard...'
                : 'Masukkan token verifikasi yang dikirimkan ke Mailtrap Anda.'}
            </p>

            {isSuccess && (
              <div className="alert alert-success">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Verifikasi sukses! Selamat datang di SecureTask Portal.
              </div>
            )}

            {error && (
              <div className="alert alert-error">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            {resendSuccess && (
              <div className="alert alert-success">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                {resendSuccess}
              </div>
            )}

            {!isSuccess && (
              <>
                <form onSubmit={handleSubmit} className="verify-form" style={{ marginTop: '1.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="token-manual-input" className="form-label">Token Verifikasi</label>
                    <input
                      id="token-manual-input"
                      type="text"
                      className="form-input token-mono-input"
                      placeholder="Masukkan 64 digit token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={isLoading || !token.trim()}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner" />
                        Memverifikasi...
                      </>
                    ) : (
                      'Verifikasi & Masuk'
                    )}
                  </button>
                </form>

                <div className="resend-section" style={{ marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Belum menerima email token atau token kedaluwarsa?
                  </p>
                  <form onSubmit={handleResend} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="email"
                      className="form-input"
                      style={{ flex: 1, minWidth: '200px' }}
                      placeholder="Email terdaftar Anda"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn-secondary"
                      disabled={isResending}
                    >
                      {isResending ? 'Mengirim...' : 'Kirim Ulang Token'}
                    </button>
                  </form>
                </div>
              </>
            )}

            <div style={{ marginTop: '2rem' }}>
              <Link to="/login" className="btn btn-ghost btn-sm">
                ← Kembali ke Halaman Login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
