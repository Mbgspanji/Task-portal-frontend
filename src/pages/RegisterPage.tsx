import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import type { UserRole } from '../utils/types';
import './LoginPage.css';
import './RegisterPage.css';

const RegisterPage: FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Post-registration verification state
  const [isRegistered, setIsRegistered] = useState(false);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const navigate = useNavigate();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password minimal harus 8 karakter.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authApi.register({ name, email, password, role });
      setIsRegistered(true);
      if (res.data.data?.previewToken) {
        setPreviewToken(res.data.data.previewToken);
        setTokenInput(res.data.data.previewToken);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Registrasi gagal. Silakan periksa data Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyToken = async (e: FormEvent) => {
    e.preventDefault();
    setVerifyError('');

    if (!tokenInput.trim()) {
      setVerifyError('Silakan masukkan token verifikasi.');
      return;
    }

    setIsVerifying(true);

    try {
      const res = await authApi.verifyEmail(tokenInput.trim());
      setVerifySuccess(true);
      if (res.data.data?.token) {
        localStorage.setItem('authToken', res.data.data.token);
        localStorage.setItem('authUser', JSON.stringify(res.data.data.user));
      }
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setVerifyError(axiosErr?.response?.data?.message || 'Token tidak valid atau kedaluwarsa.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setResendMsg('');
    setVerifyError('');

    try {
      const res = await authApi.resendVerification(email);
      setResendMsg('Token baru berhasil dikirim ke Mailtrap Anda!');
      if (res.data.data?.previewToken) {
        setPreviewToken(res.data.data.previewToken);
        setTokenInput(res.data.data.previewToken);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setVerifyError(axiosErr?.response?.data?.message || 'Gagal mengirim ulang token.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="login-page register-page">
      <div className="login-container fade-in">
        {/* Left Branding Panel */}
        <section className="login-welcome" aria-label="Welcome">
          <div className="welcome-shape welcome-shape-one" />
          <div className="welcome-shape welcome-shape-two" />
          <div className="welcome-shape welcome-shape-three" />
          <div className="welcome-content">
            <div className="login-logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6V12C4 16.4183 7.58172 20 12 22C16.4183 20 20 12V6L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(255,255,255,0.2)"/>
                <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="welcome-kicker">Bergabung bersama kami</p>
            <h1>SecureTask Portal</h1>
            <p className="welcome-copy">
              Registrasi akun baru dengan sistem keamanan token email berbasis Mailtrap.
            </p>
            <div className="feature-bullets">
              <div className="feature-bullet">
                <span className="bullet-dot" />
                <span>Pilih role sesuai otoritas Anda</span>
              </div>
              <div className="feature-bullet">
                <span className="bullet-dot" />
                <span>Aktivasi token aman via Mailtrap</span>
              </div>
              <div className="feature-bullet">
                <span className="bullet-dot" />
                <span>Kelola tugas tim dengan respons cepat</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Form Panel */}
        <section className="login-form-panel">
          {!isRegistered ? (
            <>
              <div className="login-header">
                <h2 className="login-title">Daftar Akun Baru</h2>
                <p className="login-subtitle">Lengkapi formulir di bawah untuk membuat akun baru</p>
              </div>

              {error && (
                <div className="alert alert-error" role="alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="login-form" noValidate>
                {/* Full Name */}
                <div className="form-group">
                  <label htmlFor="reg-name" className="form-label">Nama Lengkap *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <input
                      id="reg-name"
                      type="text"
                      className="form-input input-with-icon"
                      placeholder="e.g. Budi Santoso"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={100}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="form-group">
                  <label htmlFor="reg-email" className="form-label">Alamat Email *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <input
                      id="reg-email"
                      type="email"
                      className="form-input input-with-icon"
                      placeholder="budi@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="form-group">
                  <label htmlFor="reg-password" className="form-label">Password *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input input-with-icon input-with-action"
                      placeholder="Minimal 8 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="input-action"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
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

                {/* Role Selector */}
                <div className="form-group">
                  <label className="form-label">Pilih Role Akun *</label>
                  <div className="role-selection-grid">
                    <label
                      className={`role-card ${role === 'employee' ? 'selected' : ''}`}
                      onClick={() => setRole('employee')}
                    >
                      <input
                        type="radio"
                        name="user-role"
                        value="employee"
                        checked={role === 'employee'}
                        onChange={() => setRole('employee')}
                        className="role-radio"
                      />
                      <div className="role-card-icon">👤</div>
                      <div className="role-card-text">
                        <strong className="role-card-title">Employee</strong>
                        <span className="role-card-desc">Kelola dan update task pribadi</span>
                      </div>
                    </label>

                    <label
                      className={`role-card ${role === 'admin' ? 'selected' : ''}`}
                      onClick={() => setRole('admin')}
                    >
                      <input
                        type="radio"
                        name="user-role"
                        value="admin"
                        checked={role === 'admin'}
                        onChange={() => setRole('admin')}
                        className="role-radio"
                      />
                      <div className="role-card-icon">🛡️</div>
                      <div className="role-card-text">
                        <strong className="role-card-title">Admin</strong>
                        <span className="role-card-desc">Akses penuh ke semua task & user</span>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-register"
                  className="btn btn-primary btn-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner" />
                      Mendaftarkan & Mengirim Email...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                      Daftar Akun Sekarang
                    </>
                  )}
                </button>
              </form>

              <div className="auth-switch">
                <span>Sudah memiliki akun?</span>{' '}
                <Link to="/login" className="auth-link">
                  Masuk di sini
                </Link>
              </div>
            </>
          ) : (
            /* Verification Screen After Successful Register */
            <div className="verification-step-wrapper fade-in">
              <div className="verification-icon-badge">📬</div>
              <h2 className="login-title">Periksa Inbox Mailtrap Anda</h2>
              <p className="login-subtitle">
                Kami telah mengirimkan token aktivasi ke <strong>{email}</strong> melalui Mailtrap.
              </p>

              {verifySuccess ? (
                <div className="alert alert-success">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Akun berhasil diverifikasi! Mengalihkan ke dashboard...
                </div>
              ) : (
                <>
                  {previewToken && (
                    <div className="dev-token-notice">
                      <span className="dev-tag">Mailtrap Token:</span>
                      <code>{previewToken}</code>
                    </div>
                  )}

                  {resendMsg && (
                    <div className="alert alert-success">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      {resendMsg}
                    </div>
                  )}

                  {verifyError && (
                    <div className="alert alert-error">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {verifyError}
                    </div>
                  )}

                  <form onSubmit={handleVerifyToken} className="verify-form">
                    <div className="form-group">
                      <label htmlFor="verify-token-input" className="form-label">Masukkan Token Verifikasi</label>
                      <input
                        id="verify-token-input"
                        type="text"
                        className="form-input token-mono-input"
                        placeholder="Contoh: a89f6d..."
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        required
                        disabled={isVerifying}
                      />
                    </div>

                    <button
                      type="submit"
                      id="btn-verify-token"
                      className="btn btn-primary btn-full"
                      disabled={isVerifying || !tokenInput.trim()}
                    >
                      {isVerifying ? (
                        <>
                          <span className="spinner" />
                          Memverifikasi Akun...
                        </>
                      ) : (
                        '✓ Aktivasi & Masuk Akun'
                      )}
                    </button>
                  </form>

                  <div className="verification-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleResend}
                      disabled={isResending}
                    >
                      {isResending ? 'Mengirim ulang...' : '↺ Kirim Ulang Token'}
                    </button>
                    <Link to="/login" className="btn btn-ghost btn-sm">
                      Kembali ke Login
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default RegisterPage;
