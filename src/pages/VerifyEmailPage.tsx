import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import './LoginPage.css';
import './RegisterPage.css';

const VerifyEmailPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const emailParam = searchParams.get('email') || '';

  const [otpInput, setOtpInput]         = useState('');
  const [resendEmail, setResendEmail]   = useState(emailParam);
  const [isLoading, setIsLoading]       = useState(false);
  const [isSuccess, setIsSuccess]       = useState(false);
  const [error, setError]               = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [isResending, setIsResending]   = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const startCooldown = (seconds: number) => {
    setResendCooldown(seconds);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const code = otpInput.trim();

    if (!code) {
      setError('Masukkan kode OTP terlebih dahulu.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Kode OTP harus 6 digit angka.');
      return;
    }
    if (!resendEmail.trim()) {
      setError('Email tidak ditemukan. Silakan daftar ulang.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await authApi.verifyOtp(resendEmail.trim(), code);
      setIsSuccess(true);
      if (res.data.data?.token) {
        localStorage.setItem('authToken', res.data.data.token);
        localStorage.setItem('authUser', JSON.stringify(res.data.data.user));
      }
      setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Kode OTP tidak valid atau telah kedaluwarsa.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (e: FormEvent) => {
    e.preventDefault();
    if (resendCooldown > 0) return;

    if (!resendEmail.trim()) {
      setError('Masukkan email Anda untuk mengirim ulang OTP.');
      return;
    }

    setIsResending(true);
    setResendSuccess('');
    setError('');

    try {
      await authApi.resendOtp(resendEmail.trim());
      setResendSuccess('Kode OTP baru berhasil dikirimkan!');
      setOtpInput('');
      startCooldown(60);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Gagal mengirim OTP baru. Pastikan email terdaftar.');
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
                : 'Masukkan kode OTP 6 digit yang dikirimkan ke email Anda.'}
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
                {/* Email field (editable in case they arrive directly) */}
                {!emailParam && (
                  <div className="form-group" style={{ marginTop: '1rem', textAlign: 'left' }}>
                    <label htmlFor="verify-email" className="form-label">Alamat Email</label>
                    <input
                      id="verify-email"
                      type="email"
                      className="form-input"
                      placeholder="Email yang didaftarkan"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                    />
                  </div>
                )}

                <form onSubmit={handleSubmit} className="verify-form" style={{ marginTop: '1.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="otp-verify-input" className="form-label">Kode OTP (6 digit)</label>
                    <input
                      id="otp-verify-input"
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      className="form-input otp-input"
                      placeholder="123456"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      autoComplete="one-time-code"
                      disabled={isLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={isLoading || otpInput.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner" />
                        Memverifikasi...
                      </>
                    ) : (
                      'Verifikasi &amp; Masuk'
                    )}
                  </button>
                </form>

                {/* Resend OTP */}
                <div className="resend-section" style={{ marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Belum menerima kode OTP atau kode sudah kedaluwarsa?
                  </p>
                  <form onSubmit={handleResend} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="email"
                      className="form-input"
                      style={{ flex: 1, minWidth: '180px' }}
                      placeholder="Email terdaftar Anda"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn-ghost btn-sm"
                      disabled={isResending || resendCooldown > 0}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {isResending
                        ? 'Mengirim...'
                        : resendCooldown > 0
                          ? `Kirim Ulang (${resendCooldown}d)`
                          : 'Kirim Ulang OTP'}
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
