import { useState, useEffect, useCallback } from 'react';
import type { FC, FormEvent } from 'react';
import { adminApi } from '../services/api';
import type { User } from '../utils/types';
import Navbar from '../components/Navbar';
import './AdminUsersPage.css';

const AdminUsersPage: FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getAllUsers();
      setUsers(res.data.data);
    } catch {
      setError('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchUsers);
  }, [fetchUsers]);

  const handleCreateEmployee = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsCreating(true);
    try {
      const res = await adminApi.createEmployee({ name, email, password });
      setUsers((prev) => [res.data.data, ...prev]);
      setShowModal(false);
      setName('');
      setEmail('');
      setPassword('');
      setSuccessMsg('Employee account created successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setFormError(axiosErr?.response?.data?.message || 'Failed to create employee.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="admin-users-page dashboard-page">
      <Navbar />
      <main className="admin-main">
        <div className="container">

          <div className="page-header fade-in">
            <div>
              <h1 className="page-title">👥 User Management</h1>
              <p className="page-subtitle">Create and manage employee accounts in the portal</p>
            </div>
            <button
              id="btn-add-employee"
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Employee
            </button>
          </div>

          {successMsg && (
            <div className="alert alert-success fade-in">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              {successMsg}
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <div className="users-section fade-in">
            <div className="section-header">
              <h2 className="section-title">All Users <span className="count-badge">{users.length}</span></h2>
            </div>

            {isLoading ? (
              <div className="loading-state">
                <div className="spinner" style={{ width: '2rem', height: '2rem', color: 'var(--color-primary)' }} />
                <p>Loading users...</p>
              </div>
            ) : (
              <div className="users-grid">
                {users.map((u) => (
                  <div key={u.id} className="user-card">
                    <div className="user-card-avatar">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-card-info">
                      <p className="user-card-name">{u.name}</p>
                      <p className="user-card-email">{u.email}</p>
                      <div className="user-card-meta">
                        <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-employee'}`}>
                          {u.role}
                        </span>
                        <span className="user-card-date">
                          Joined {new Date(u.created_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Employee Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Employee Account</h2>
              <p>The new employee will be able to log in and manage their own tasks</p>
            </div>

            {formError && (
              <div className="alert alert-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateEmployee}>
              <div className="form-group">
                <label htmlFor="emp-name" className="form-label">Full Name *</label>
                <input
                  id="emp-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label htmlFor="emp-email" className="form-label">Email Address *</label>
                <input
                  id="emp-email"
                  type="email"
                  className="form-input"
                  placeholder="jane@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="emp-password" className="form-label">Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="emp-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0,
                      background: 'none', border: 'none', padding: '0 0.875rem',
                      cursor: 'pointer', color: 'var(--text-muted)',
                      display: 'flex', alignItems: 'center'
                    }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Minimum 8 characters required
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setShowModal(false); setFormError(''); }}
                  id="btn-cancel-employee"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreating}
                  id="btn-submit-employee"
                >
                  {isCreating ? <><span className="spinner" /> Creating...</> : '+ Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
